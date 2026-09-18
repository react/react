use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;

use criterion::{BatchSize, Criterion, SamplingMode, Throughput, black_box};
use react_compiler::entrypoint::{PluginOptions, compile_program};
use react_compiler_ast::File;
use react_compiler_ast::scope::ScopeInfo;
use serde::Deserialize;
use serde::de::DeserializeOwned;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Manifest {
    version: u32,
    fixtures: Vec<ManifestFixture>,
    failures: Vec<FailedFixture>,
    total_source_bytes: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ManifestFixture {
    fixture: String,
    ast: PathBuf,
    scope: PathBuf,
    options: PathBuf,
}

#[derive(Deserialize)]
struct FailedFixture {
    fixture: String,
    error: String,
}

#[derive(Clone)]
struct Fixture {
    ast: File,
    scope: ScopeInfo,
    options: PluginOptions,
}

#[cfg(unix)]
fn peak_rss_bytes() -> u64 {
    let mut usage = std::mem::MaybeUninit::<libc::rusage>::zeroed();
    let result = unsafe { libc::getrusage(libc::RUSAGE_SELF, usage.as_mut_ptr()) };
    assert_eq!(result, 0, "getrusage failed");
    let max_rss = unsafe { usage.assume_init() }.ru_maxrss as u64;

    if cfg!(target_os = "macos") {
        max_rss
    } else {
        max_rss * 1024
    }
}

fn read_json<T: DeserializeOwned>(path: &Path) -> T {
    let json = fs::read_to_string(path)
        .unwrap_or_else(|error| panic!("Failed to read {}: {error}", path.display()));
    let mut deserializer = serde_json::Deserializer::from_str(&json);
    deserializer.disable_recursion_limit();
    T::deserialize(&mut deserializer)
        .unwrap_or_else(|error| panic!("Failed to deserialize {}: {error}", path.display()))
}

fn load_fixtures() -> (Vec<Fixture>, u64) {
    let benchmark_dir = PathBuf::from(std::env::var("REACT_COMPILER_BENCHMARK_DIR").expect(
        "REACT_COMPILER_BENCHMARK_DIR is unset; run compiler/scripts/benchmark-rust-compiler.sh",
    ));
    let manifest: Manifest = read_json(&benchmark_dir.join("manifest.json"));

    assert_eq!(
        manifest.version, 1,
        "Unsupported benchmark manifest version"
    );
    if !manifest.failures.is_empty() {
        eprintln!(
            "Input generation skipped {} fixtures:",
            manifest.failures.len()
        );
        for failure in &manifest.failures {
            eprintln!("  {}: {}", failure.fixture, failure.error);
        }
    }

    let fixtures = manifest
        .fixtures
        .into_iter()
        .map(|fixture| {
            let mut options: PluginOptions = read_json(&benchmark_dir.join(fixture.options));
            options.profiling = false;
            let loaded = Fixture {
                ast: read_json(&benchmark_dir.join(fixture.ast)),
                scope: read_json(&benchmark_dir.join(fixture.scope)),
                options,
            };
            black_box(fixture.fixture);
            loaded
        })
        .collect::<Vec<_>>();

    assert!(!fixtures.is_empty(), "No benchmark fixtures were generated");
    (fixtures, manifest.total_source_bytes)
}

fn compile_corpus(fixtures: Vec<Fixture>) {
    for fixture in fixtures {
        black_box(compile_program(fixture.ast, fixture.scope, fixture.options));
    }
}

fn benchmark(criterion: &mut Criterion) {
    let (fixtures, total_source_bytes) = load_fixtures();
    let fixture_count = fixtures.len();
    let mut group = criterion.benchmark_group("react_compiler");
    group.sampling_mode(SamplingMode::Flat);
    group.sample_size(50);
    group.warm_up_time(Duration::from_secs(3));
    group.measurement_time(Duration::from_secs(30));
    group.throughput(Throughput::Bytes(total_source_bytes));
    group.bench_function(format!("full_corpus/{fixture_count}_fixtures"), |bencher| {
        bencher.iter_batched(|| fixtures.clone(), compile_corpus, BatchSize::PerIteration);
    });
    group.finish();
}

#[cfg(unix)]
fn memory_worker() {
    let (fixtures, _) = load_fixtures();
    compile_corpus(fixtures);
    println!("{}", peak_rss_bytes());
}

#[cfg(unix)]
fn percentile(sorted: &[u64], percentile: f64) -> f64 {
    let index = percentile * (sorted.len() - 1) as f64;
    let lower = index.floor() as usize;
    let upper = index.ceil() as usize;
    let weight = index - lower as f64;
    sorted[lower] as f64 * (1.0 - weight) + sorted[upper] as f64 * weight
}

#[cfg(unix)]
fn benchmark_memory() {
    let sample_count = std::env::var("REACT_COMPILER_MEMORY_SAMPLES")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(50);
    assert!(sample_count > 0, "Memory sample count must be positive");

    let executable = std::env::current_exe().expect("Failed to locate benchmark executable");
    let mut samples = Vec::with_capacity(sample_count);
    eprintln!("Sampling peak RSS across {sample_count} fresh processes...");

    for _ in 0..sample_count {
        let output = Command::new(&executable)
            .env("REACT_COMPILER_MEMORY_WORKER", "1")
            .output()
            .expect("Failed to run memory benchmark worker");
        assert!(
            output.status.success(),
            "Memory benchmark worker failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        samples.push(
            String::from_utf8(output.stdout)
                .expect("Worker output was not UTF-8")
                .trim()
                .parse::<u64>()
                .expect("Worker output contained an invalid RSS value"),
        );
    }

    samples.sort_unstable();
    let mean = samples.iter().sum::<u64>() as f64 / samples.len() as f64;
    let mib = 1024.0 * 1024.0;
    println!(
        "Full-corpus peak RSS: mean {:.1} MiB, median {:.1} MiB, 95% sample range [{:.1} MiB, {:.1} MiB]",
        mean / mib,
        percentile(&samples, 0.5) / mib,
        percentile(&samples, 0.025) / mib,
        percentile(&samples, 0.975) / mib,
    );
}

fn main() {
    #[cfg(unix)]
    if std::env::var_os("REACT_COMPILER_MEMORY_WORKER").is_some() {
        memory_worker();
        return;
    }

    std::thread::Builder::new()
        .name("react-compiler-benchmark".to_string())
        .stack_size(64 * 1024 * 1024)
        .spawn(|| {
            let mut criterion = Criterion::default().configure_from_args();
            benchmark(&mut criterion);
            criterion.final_summary();
            #[cfg(unix)]
            benchmark_memory();
        })
        .expect("Failed to spawn benchmark thread")
        .join()
        .expect("Benchmark thread panicked");
}
