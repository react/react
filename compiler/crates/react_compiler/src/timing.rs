// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Simple timing accumulator for profiling compiler passes.
//!
//! Uses `std::time::Instant` unconditionally (cheap when not storing results).
//! Controlled by the `__profiling` flag in plugin options.

use serde::Serialize;
use std::time::{Duration, Instant};

/// A single timing entry recording how long a named phase took.
#[derive(Debug, Clone, Serialize)]
pub struct TimingEntry {
    pub name: String,
    pub duration_us: u64,
}

/// Accumulates timing data for compiler passes.
pub struct TimingData {
    enabled: bool,
    entries: Vec<(String, Duration)>,
    current_name: Option<String>,
    current_start: Option<Instant>,
}

impl TimingData {
    /// Create a new TimingData. If `enabled` is false, all operations are no-ops.
    pub fn new(enabled: bool) -> Self {
        Self {
            enabled,
            entries: Vec::new(),
            current_name: None,
            current_start: None,
        }
    }

    /// Start timing a named phase. Stops any currently running phase first.
    pub fn start(&mut self, name: &str) {
        if !self.enabled {
            return;
        }
        // Stop any currently running phase
        if self.current_start.is_some() {
            self.stop();
        }
        self.current_name = Some(name.to_string());
        self.current_start = Some(Instant::now());
    }

    /// Stop the currently running phase and record its duration.
    pub fn stop(&mut self) {
        if !self.enabled {
            return;
        }
        if let (Some(name), Some(start)) = (self.current_name.take(), self.current_start.take()) {
            self.entries.push((name, start.elapsed()));
        }
    }

    /// Consume this TimingData and return the collected entries.
    pub fn into_entries(mut self) -> Vec<TimingEntry> {
        // Stop any still-running phase
        self.stop();
        self.entries
            .into_iter()
            .map(|(name, duration)| TimingEntry {
                name,
                duration_us: duration.as_micros() as u64,
            })
            .collect()
    }
}
