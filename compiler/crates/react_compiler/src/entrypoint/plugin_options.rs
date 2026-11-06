use react_compiler_hir::environment_config::EnvironmentConfig;
use serde::{Deserialize, Serialize};

/// Target configuration for the compiler
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum CompilerTarget {
    /// Standard React version target
    Version(String), // "17", "18", "19"
    /// Meta-internal target with custom runtime module
    MetaInternal {
        kind: String, // "donotuse_meta_internal"
        #[serde(rename = "runtimeModule")]
        runtime_module: String,
    },
}

/// Gating configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatingConfig {
    pub source: String,
    #[serde(rename = "importSpecifierName")]
    pub import_specifier_name: String,
}

/// Dynamic gating configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DynamicGatingConfig {
    pub source: String,
}

/// Serializable plugin options, pre-resolved by the JS shim.
/// JS-only values (sources function, logger, etc.) are resolved before
/// being sent to Rust.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginOptions {
    // Pre-resolved by JS
    pub should_compile: bool,
    pub enable_reanimated: bool,
    pub is_dev: bool,
    pub filename: Option<String>,

    // Pass-through options
    #[serde(default = "default_compilation_mode")]
    pub compilation_mode: String,
    #[serde(default = "default_panic_threshold")]
    pub panic_threshold: String,
    #[serde(default = "default_target")]
    pub target: CompilerTarget,
    #[serde(default)]
    pub gating: Option<GatingConfig>,
    #[serde(default)]
    pub dynamic_gating: Option<DynamicGatingConfig>,
    #[serde(default)]
    pub no_emit: bool,
    #[serde(default)]
    pub output_mode: Option<String>,
    #[serde(default)]
    pub eslint_suppression_rules: Option<Vec<String>>,
    #[serde(default = "default_true")]
    pub flow_suppressions: bool,
    #[serde(default)]
    pub ignore_use_no_forget: bool,
    #[serde(default)]
    pub custom_opt_out_directives: Option<Vec<String>>,
    #[serde(default)]
    pub environment: EnvironmentConfig,

    /// Source code of the file being compiled (passed from Babel plugin for fast refresh hash).
    #[serde(default, rename = "__sourceCode")]
    pub source_code: Option<String>,

    /// Enable profiling timing data collection.
    #[serde(default, rename = "__profiling")]
    pub profiling: bool,

    /// Enable debug logging (HIR formatting after each pass).
    /// Only set to true when a logger with debugLogIRs is configured on the JS side.
    #[serde(default, rename = "__debug")]
    pub debug: bool,
}

fn default_compilation_mode() -> String {
    "infer".to_string()
}

fn default_panic_threshold() -> String {
    "none".to_string()
}

fn default_target() -> CompilerTarget {
    CompilerTarget::Version("19".to_string())
}

fn default_true() -> bool {
    true
}

/// Output mode for the compiler, derived from PluginOptions.
/// Matches the TS `compilerOutputMode` logic in Program.ts.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CompilerOutputMode {
    Ssr,
    Client,
    Lint,
}

impl PluginOptions {
    /// Fold the JS-resolved `is_dev` / `enable_reanimated` flags into the
    /// environment config.
    ///
    /// These flags can only be computed on the JS side, since they depend on
    /// `process.env` / `__DEV__` and on the Babel plugin list. This mirrors
    /// what the TypeScript Babel plugin does in `BabelPlugin.ts`:
    ///
    /// - in development, enable the Fast Refresh memo-cache reset unless the
    ///   user explicitly passed `enableResetCacheOnSourceFileChanges: false`;
    /// - when Reanimated is detected, enable its custom type definitions.
    pub fn apply_js_resolved_flags(&mut self) {
        if self.is_dev && self.environment.enable_reset_cache_on_source_file_changes != Some(false)
        {
            self.environment.enable_reset_cache_on_source_file_changes = Some(true);
        }
        if self.enable_reanimated {
            self.environment
                .enable_custom_type_definition_for_reanimated = true;
        }
    }
}

impl CompilerOutputMode {
    pub fn from_opts(opts: &PluginOptions) -> Self {
        match opts.output_mode.as_deref() {
            Some("ssr") => Self::Ssr,
            Some("lint") => Self::Lint,
            _ if opts.no_emit => Self::Lint,
            _ => Self::Client,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_options() -> PluginOptions {
        PluginOptions {
            should_compile: true,
            enable_reanimated: false,
            is_dev: false,
            filename: None,
            compilation_mode: default_compilation_mode(),
            panic_threshold: default_panic_threshold(),
            target: default_target(),
            gating: None,
            dynamic_gating: None,
            no_emit: false,
            output_mode: None,
            eslint_suppression_rules: None,
            flow_suppressions: true,
            ignore_use_no_forget: false,
            custom_opt_out_directives: None,
            environment: EnvironmentConfig::default(),
            source_code: None,
            profiling: false,
            debug: false,
        }
    }

    #[test]
    fn dev_enables_reset_cache_by_default() {
        let mut opts = base_options();
        opts.is_dev = true;
        opts.apply_js_resolved_flags();
        assert_eq!(
            opts.environment.enable_reset_cache_on_source_file_changes,
            Some(true)
        );
    }

    #[test]
    fn dev_does_not_override_explicit_false() {
        let mut opts = base_options();
        opts.is_dev = true;
        opts.environment.enable_reset_cache_on_source_file_changes = Some(false);
        opts.apply_js_resolved_flags();
        assert_eq!(
            opts.environment.enable_reset_cache_on_source_file_changes,
            Some(false)
        );
    }

    #[test]
    fn production_leaves_reset_cache_unset() {
        let mut opts = base_options();
        opts.apply_js_resolved_flags();
        assert_eq!(
            opts.environment.enable_reset_cache_on_source_file_changes,
            None
        );
    }

    #[test]
    fn reanimated_enables_custom_type_definitions() {
        let mut opts = base_options();
        opts.enable_reanimated = true;
        opts.apply_js_resolved_flags();
        assert!(
            opts.environment
                .enable_custom_type_definition_for_reanimated
        );
    }

    #[test]
    fn no_reanimated_leaves_custom_type_definitions_disabled() {
        let mut opts = base_options();
        opts.apply_js_resolved_flags();
        assert!(
            !opts
                .environment
                .enable_custom_type_definition_for_reanimated
        );
    }
}
