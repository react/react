use std::fs;
use std::path::{Path, PathBuf};
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

#[cfg(unix)]
fn print_peak_rss(label: &str) {
    let peak_mib = peak_rss_bytes() as f64 / (1024.0 * 1024.0);
    eprintln!("Peak RSS {label}: {peak_mib:.1} MiB");
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

fn benchmark(criterion: &mut Criterion) {
    let (fixtures, total_source_bytes) = load_fixtures();
    #[cfg(unix)]
    print_peak_rss("after loading fixtures");
    let fixture_count = fixtures.len();
    let mut group = criterion.benchmark_group("react_compiler");
    group.sampling_mode(SamplingMode::Flat);
    group.sample_size(50);
    group.warm_up_time(Duration::from_secs(3));
    group.measurement_time(Duration::from_secs(30));
    group.throughput(Throughput::Bytes(total_source_bytes));
    group.bench_function(format!("full_corpus/{fixture_count}_fixtures"), |bencher| {
        bencher.iter_batched(
            || fixtures.clone(),
            |fixtures| {
                for fixture in fixtures {
                    black_box(compile_program(fixture.ast, fixture.scope, fixture.options));
                }
            },
            BatchSize::PerIteration,
        );
    });
    group.finish();
    #[cfg(unix)]
    print_peak_rss("after benchmark");
}

fn main() {
    std::thread::Builder::new()
        .name("react-compiler-benchmark".to_string())
        .stack_size(64 * 1024 * 1024)
        .spawn(|| {
            let mut criterion = Criterion::default().configure_from_args();
            benchmark(&mut criterion);
            criterion.final_summary();
        })
        .expect("Failed to spawn benchmark thread")
        .join()
        .expect("Benchmark thread panicked");
}
