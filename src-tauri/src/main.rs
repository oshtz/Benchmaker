#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

const CURRENT_SCHEMA_VERSION: i64 = 2;

// ============================================================================
// Data Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseMetadata {
    pub category: Option<String>,
    pub difficulty: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TestCase {
    pub id: String,
    pub prompt: String,
    pub expected_output: Option<String>,
    pub scoring_method: String,
    pub weight: f64,
    pub metadata: TestCaseMetadata,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TestSuite {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub system_prompt: String,
    pub judge_system_prompt: Option<String>,
    pub test_cases: Vec<TestCase>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScoringResult {
    pub score: f64,
    pub confidence: Option<f64>,
    pub notes: Option<String>,
    pub raw_score: Option<f64>,
    pub max_score: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ModelParameters {
    pub temperature: f64,
    pub top_p: f64,
    pub max_tokens: i64,
    pub frequency_penalty: f64,
    pub presence_penalty: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseResult {
    pub test_case_id: String,
    pub model_id: String,
    pub response: String,
    pub token_count: Option<i64>,
    pub latency_ms: Option<i64>,
    pub status: String,
    pub error: Option<String>,
    pub score: Option<ScoringResult>,
    pub streamed_content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RunResult {
    pub id: String,
    pub test_suite_id: String,
    pub test_suite_name: String,
    pub models: Vec<String>,
    pub parameters: ModelParameters,
    pub results: Vec<TestCaseResult>,
    pub status: String,
    pub started_at: i64,
    pub completed_at: Option<i64>,
    pub judge_model: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub active_test_suite_id: Option<String>,
    pub current_run_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BenchmakerDb {
    pub version: i64,
    pub updated_at: i64,
    pub test_suites: Vec<TestSuite>,
    pub runs: Vec<RunResult>,
    pub active_test_suite_id: Option<String>,
    pub current_run_id: Option<String>,
}

// ============================================================================
// Database Setup & Migration
// ============================================================================

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "Unable to resolve app data directory.".to_string())?;
    fs::create_dir_all(&data_dir).map_err(|err| err.to_string())?;
    Ok(data_dir.join("benchmaker.sqlite"))
}

fn open_db(app: &AppHandle) -> Result<Connection, String> {
    let path = db_path(app)?;
    let conn = Connection::open(&path).map_err(|err| err.to_string())?;

    // Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|err| err.to_string())?;

    // Run migrations
    migrate_database(&conn)?;

    Ok(conn)
}

fn migrate_database(conn: &Connection) -> Result<(), String> {
    // Create schema_version table if not exists
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_version (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            version INTEGER NOT NULL
        )",
        [],
    ).map_err(|err| err.to_string())?;

    // Get current version
    let current_version: i64 = conn
        .query_row("SELECT version FROM schema_version WHERE id = 1", [], |row| row.get(0))
        .optional()
        .map_err(|err| err.to_string())?
        .unwrap_or(0);

    if current_version < CURRENT_SCHEMA_VERSION {
        // Check if we have old snapshot table to migrate
        let has_old_snapshot: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='benchmaker_snapshot'",
                [],
                |row| row.get(0),
            )
            .map_err(|err| err.to_string())?;

        // Create new normalized tables
        create_normalized_tables(conn)?;

        // Migrate data from old snapshot if exists
        if has_old_snapshot && current_version < 2 {
            migrate_from_snapshot(conn)?;
        }

        // Update schema version
        conn.execute(
            "INSERT INTO schema_version (id, version) VALUES (1, ?)
             ON CONFLICT(id) DO UPDATE SET version = excluded.version",
            params![CURRENT_SCHEMA_VERSION],
        ).map_err(|err| err.to_string())?;
    }

    Ok(())
}

fn create_normalized_tables(conn: &Connection) -> Result<(), String> {
    // Test Suites table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS test_suites (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            system_prompt TEXT NOT NULL,
            judge_system_prompt TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    ).map_err(|err| err.to_string())?;

    // Test Cases table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS test_cases (
            id TEXT PRIMARY KEY,
            test_suite_id TEXT NOT NULL,
            prompt TEXT NOT NULL,
            expected_output TEXT,
            scoring_method TEXT NOT NULL,
            weight REAL NOT NULL DEFAULT 1.0,
            category TEXT,
            difficulty TEXT,
            tags TEXT NOT NULL DEFAULT '[]',
            sort_order INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (test_suite_id) REFERENCES test_suites(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|err| err.to_string())?;

    // Runs table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS runs (
            id TEXT PRIMARY KEY,
            test_suite_id TEXT NOT NULL,
            test_suite_name TEXT NOT NULL,
            models TEXT NOT NULL,
            parameters TEXT NOT NULL,
            status TEXT NOT NULL,
            started_at INTEGER NOT NULL,
            completed_at INTEGER,
            judge_model TEXT
        )",
        [],
    ).map_err(|err| err.to_string())?;

    // Test Case Results table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS test_case_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            test_case_id TEXT NOT NULL,
            model_id TEXT NOT NULL,
            response TEXT NOT NULL DEFAULT '',
            token_count INTEGER,
            latency_ms INTEGER,
            status TEXT NOT NULL,
            error TEXT,
            score TEXT,
            streamed_content TEXT,
            FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|err| err.to_string())?;

    // App State table (singleton)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS app_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            active_test_suite_id TEXT,
            current_run_id TEXT
        )",
        [],
    ).map_err(|err| err.to_string())?;

    // Initialize app_state if empty
    conn.execute(
        "INSERT OR IGNORE INTO app_state (id, active_test_suite_id, current_run_id) VALUES (1, NULL, NULL)",
        [],
    ).map_err(|err| err.to_string())?;

    // Create indexes for common queries
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_test_cases_suite ON test_cases(test_suite_id)",
        [],
    ).map_err(|err| err.to_string())?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_results_run ON test_case_results(run_id)",
        [],
    ).map_err(|err| err.to_string())?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_runs_suite ON runs(test_suite_id)",
        [],
    ).map_err(|err| err.to_string())?;

    Ok(())
}

fn migrate_from_snapshot(conn: &Connection) -> Result<(), String> {
    // Read old snapshot
    let payload: Option<String> = conn
        .query_row(
            "SELECT payload FROM benchmaker_snapshot WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|err| err.to_string())?;

    if let Some(json_payload) = payload {
        let old_data: BenchmakerDb = serde_json::from_str(&json_payload)
            .map_err(|err| format!("Failed to parse old snapshot: {}", err))?;

        // Migrate test suites and test cases
        for suite in &old_data.test_suites {
            conn.execute(
                "INSERT OR REPLACE INTO test_suites (id, name, description, system_prompt, judge_system_prompt, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                params![
                    suite.id,
                    suite.name,
                    suite.description,
                    suite.system_prompt,
                    suite.judge_system_prompt,
                    suite.created_at,
                    suite.updated_at,
                ],
            ).map_err(|err| err.to_string())?;

            for (idx, test_case) in suite.test_cases.iter().enumerate() {
                let tags_json = serde_json::to_string(&test_case.metadata.tags)
                    .unwrap_or_else(|_| "[]".to_string());

                conn.execute(
                    "INSERT OR REPLACE INTO test_cases (id, test_suite_id, prompt, expected_output, scoring_method, weight, category, difficulty, tags, sort_order)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![
                        test_case.id,
                        suite.id,
                        test_case.prompt,
                        test_case.expected_output,
                        test_case.scoring_method,
                        test_case.weight,
                        test_case.metadata.category,
                        test_case.metadata.difficulty,
                        tags_json,
                        idx as i64,
                    ],
                ).map_err(|err| err.to_string())?;
            }
        }

        // Migrate runs and results
        for run in &old_data.runs {
            let models_json = serde_json::to_string(&run.models)
                .unwrap_or_else(|_| "[]".to_string());
            let params_json = serde_json::to_string(&run.parameters)
                .unwrap_or_else(|_| "{}".to_string());

            conn.execute(
                "INSERT OR REPLACE INTO runs (id, test_suite_id, test_suite_name, models, parameters, status, started_at, completed_at, judge_model)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    run.id,
                    run.test_suite_id,
                    run.test_suite_name,
                    models_json,
                    params_json,
                    run.status,
                    run.started_at,
                    run.completed_at,
                    run.judge_model,
                ],
            ).map_err(|err| err.to_string())?;

            for result in &run.results {
                let score_json = result.score.as_ref()
                    .map(|s| serde_json::to_string(s).unwrap_or_else(|_| "null".to_string()));

                conn.execute(
                    "INSERT INTO test_case_results (run_id, test_case_id, model_id, response, token_count, latency_ms, status, error, score, streamed_content)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![
                        run.id,
                        result.test_case_id,
                        result.model_id,
                        result.response,
                        result.token_count,
                        result.latency_ms,
                        result.status,
                        result.error,
                        score_json,
                        result.streamed_content,
                    ],
                ).map_err(|err| err.to_string())?;
            }
        }

        // Migrate app state
        conn.execute(
            "UPDATE app_state SET active_test_suite_id = ?, current_run_id = ? WHERE id = 1",
            params![old_data.active_test_suite_id, old_data.current_run_id],
        ).map_err(|err| err.to_string())?;

        // Drop old snapshot table after successful migration
        conn.execute("DROP TABLE IF EXISTS benchmaker_snapshot", [])
            .map_err(|err| err.to_string())?;
    }

    Ok(())
}

// ============================================================================
// Tauri Commands - Test Suites
// ============================================================================

#[tauri::command]
fn get_all_test_suites(app: AppHandle) -> Result<Vec<TestSuite>, String> {
    let conn = open_db(&app)?;

    let mut stmt = conn
        .prepare("SELECT id, name, description, system_prompt, judge_system_prompt, created_at, updated_at FROM test_suites ORDER BY updated_at DESC")
        .map_err(|err| err.to_string())?;

    let suite_rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, i64>(5)?,
                row.get::<_, i64>(6)?,
            ))
        })
        .map_err(|err| err.to_string())?;

    let mut suites = Vec::new();
    for row in suite_rows {
        let (id, name, description, system_prompt, judge_system_prompt, created_at, updated_at) = row.map_err(|err| err.to_string())?;

        // Get test cases for this suite
        let test_cases = get_test_cases_for_suite(&conn, &id)?;

        suites.push(TestSuite {
            id,
            name,
            description,
            system_prompt,
            judge_system_prompt,
            test_cases,
            created_at,
            updated_at,
        });
    }

    Ok(suites)
}

fn get_test_cases_for_suite(conn: &Connection, suite_id: &str) -> Result<Vec<TestCase>, String> {
    let mut stmt = conn
        .prepare("SELECT id, prompt, expected_output, scoring_method, weight, category, difficulty, tags FROM test_cases WHERE test_suite_id = ? ORDER BY sort_order")
        .map_err(|err| err.to_string())?;

    let rows = stmt
        .query_map(params![suite_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, f64>(4)?,
                row.get::<_, Option<String>>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, String>(7)?,
            ))
        })
        .map_err(|err| err.to_string())?;

    let mut test_cases = Vec::new();
    for row in rows {
        let (id, prompt, expected_output, scoring_method, weight, category, difficulty, tags_json) = row.map_err(|err| err.to_string())?;
        let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

        test_cases.push(TestCase {
            id,
            prompt,
            expected_output,
            scoring_method,
            weight,
            metadata: TestCaseMetadata {
                category,
                difficulty,
                tags,
            },
        });
    }

    Ok(test_cases)
}

#[tauri::command]
fn save_test_suite(app: AppHandle, suite: TestSuite) -> Result<(), String> {
    let conn = open_db(&app)?;

    conn.execute(
        "INSERT INTO test_suites (id, name, description, system_prompt, judge_system_prompt, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           description = excluded.description,
           system_prompt = excluded.system_prompt,
           judge_system_prompt = excluded.judge_system_prompt,
           updated_at = excluded.updated_at",
        params![
            suite.id,
            suite.name,
            suite.description,
            suite.system_prompt,
            suite.judge_system_prompt,
            suite.created_at,
            suite.updated_at,
        ],
    ).map_err(|err| err.to_string())?;

    // Delete existing test cases and re-insert (simpler than diffing)
    conn.execute("DELETE FROM test_cases WHERE test_suite_id = ?", params![suite.id])
        .map_err(|err| err.to_string())?;

    for (idx, test_case) in suite.test_cases.iter().enumerate() {
        let tags_json = serde_json::to_string(&test_case.metadata.tags)
            .unwrap_or_else(|_| "[]".to_string());

        conn.execute(
            "INSERT INTO test_cases (id, test_suite_id, prompt, expected_output, scoring_method, weight, category, difficulty, tags, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                test_case.id,
                suite.id,
                test_case.prompt,
                test_case.expected_output,
                test_case.scoring_method,
                test_case.weight,
                test_case.metadata.category,
                test_case.metadata.difficulty,
                tags_json,
                idx as i64,
            ],
        ).map_err(|err| err.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn delete_test_suite(app: AppHandle, id: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute("DELETE FROM test_suites WHERE id = ?", params![id])
        .map_err(|err| err.to_string())?;
    Ok(())
}

// ============================================================================
// Tauri Commands - Runs
// ============================================================================

#[tauri::command]
fn get_all_runs(app: AppHandle) -> Result<Vec<RunResult>, String> {
    let conn = open_db(&app)?;

    let mut stmt = conn
        .prepare("SELECT id, test_suite_id, test_suite_name, models, parameters, status, started_at, completed_at, judge_model FROM runs ORDER BY started_at DESC")
        .map_err(|err| err.to_string())?;

    let run_rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, i64>(6)?,
                row.get::<_, Option<i64>>(7)?,
                row.get::<_, Option<String>>(8)?,
            ))
        })
        .map_err(|err| err.to_string())?;

    let mut runs = Vec::new();
    for row in run_rows {
        let (id, test_suite_id, test_suite_name, models_json, params_json, status, started_at, completed_at, judge_model) = row.map_err(|err| err.to_string())?;

        let models: Vec<String> = serde_json::from_str(&models_json).unwrap_or_default();
        let parameters: ModelParameters = serde_json::from_str(&params_json)
            .unwrap_or(ModelParameters {
                temperature: 0.7,
                top_p: 1.0,
                max_tokens: 1024,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

        let results = get_results_for_run(&conn, &id)?;

        runs.push(RunResult {
            id,
            test_suite_id,
            test_suite_name,
            models,
            parameters,
            results,
            status,
            started_at,
            completed_at,
            judge_model,
        });
    }

    Ok(runs)
}

fn get_results_for_run(conn: &Connection, run_id: &str) -> Result<Vec<TestCaseResult>, String> {
    let mut stmt = conn
        .prepare("SELECT test_case_id, model_id, response, token_count, latency_ms, status, error, score, streamed_content FROM test_case_results WHERE run_id = ?")
        .map_err(|err| err.to_string())?;

    let rows = stmt
        .query_map(params![run_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<i64>>(3)?,
                row.get::<_, Option<i64>>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, Option<String>>(7)?,
                row.get::<_, Option<String>>(8)?,
            ))
        })
        .map_err(|err| err.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        let (test_case_id, model_id, response, token_count, latency_ms, status, error, score_json, streamed_content) = row.map_err(|err| err.to_string())?;

        let score: Option<ScoringResult> = score_json
            .and_then(|s| serde_json::from_str(&s).ok());

        results.push(TestCaseResult {
            test_case_id,
            model_id,
            response,
            token_count,
            latency_ms,
            status,
            error,
            score,
            streamed_content,
        });
    }

    Ok(results)
}

#[tauri::command]
fn save_run(app: AppHandle, run: RunResult) -> Result<(), String> {
    let conn = open_db(&app)?;

    let models_json = serde_json::to_string(&run.models)
        .unwrap_or_else(|_| "[]".to_string());
    let params_json = serde_json::to_string(&run.parameters)
        .unwrap_or_else(|_| "{}".to_string());

    conn.execute(
        "INSERT INTO runs (id, test_suite_id, test_suite_name, models, parameters, status, started_at, completed_at, judge_model)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           status = excluded.status,
           completed_at = excluded.completed_at",
        params![
            run.id,
            run.test_suite_id,
            run.test_suite_name,
            models_json,
            params_json,
            run.status,
            run.started_at,
            run.completed_at,
            run.judge_model,
        ],
    ).map_err(|err| err.to_string())?;

    // Delete existing results and re-insert
    conn.execute("DELETE FROM test_case_results WHERE run_id = ?", params![run.id])
        .map_err(|err| err.to_string())?;

    for result in &run.results {
        let score_json = result.score.as_ref()
            .map(|s| serde_json::to_string(s).unwrap_or_else(|_| "null".to_string()));

        conn.execute(
            "INSERT INTO test_case_results (run_id, test_case_id, model_id, response, token_count, latency_ms, status, error, score, streamed_content)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                run.id,
                result.test_case_id,
                result.model_id,
                result.response,
                result.token_count,
                result.latency_ms,
                result.status,
                result.error,
                score_json,
                result.streamed_content,
            ],
        ).map_err(|err| err.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn delete_run(app: AppHandle, id: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute("DELETE FROM runs WHERE id = ?", params![id])
        .map_err(|err| err.to_string())?;
    Ok(())
}

// ============================================================================
// Tauri Commands - App State
// ============================================================================

#[tauri::command]
fn get_app_state(app: AppHandle) -> Result<AppState, String> {
    let conn = open_db(&app)?;

    let state = conn
        .query_row(
            "SELECT active_test_suite_id, current_run_id FROM app_state WHERE id = 1",
            [],
            |row| Ok(AppState {
                active_test_suite_id: row.get(0)?,
                current_run_id: row.get(1)?,
            }),
        )
        .optional()
        .map_err(|err| err.to_string())?
        .unwrap_or(AppState {
            active_test_suite_id: None,
            current_run_id: None,
        });

    Ok(state)
}

#[tauri::command]
fn save_app_state(app: AppHandle, state: AppState) -> Result<(), String> {
    let conn = open_db(&app)?;

    conn.execute(
        "INSERT INTO app_state (id, active_test_suite_id, current_run_id)
         VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           active_test_suite_id = excluded.active_test_suite_id,
           current_run_id = excluded.current_run_id",
        params![state.active_test_suite_id, state.current_run_id],
    ).map_err(|err| err.to_string())?;

    Ok(())
}

// ============================================================================
// Legacy Command (for backwards compatibility during transition)
// ============================================================================

#[tauri::command]
fn read_snapshot(app: AppHandle) -> Result<Option<BenchmakerDb>, String> {
    let conn = open_db(&app)?;

    // Build snapshot from normalized tables
    let test_suites = get_all_test_suites_internal(&conn)?;
    let runs = get_all_runs_internal(&conn)?;
    let state = conn
        .query_row(
            "SELECT active_test_suite_id, current_run_id FROM app_state WHERE id = 1",
            [],
            |row| Ok((row.get::<_, Option<String>>(0)?, row.get::<_, Option<String>>(1)?)),
        )
        .optional()
        .map_err(|err| err.to_string())?
        .unwrap_or((None, None));

    Ok(Some(BenchmakerDb {
        version: CURRENT_SCHEMA_VERSION,
        updated_at: chrono_now(),
        test_suites,
        runs,
        active_test_suite_id: state.0,
        current_run_id: state.1,
    }))
}

#[tauri::command]
fn write_snapshot(app: AppHandle, snapshot: BenchmakerDb) -> Result<(), String> {
    let conn = open_db(&app)?;

    // Write test suites
    for suite in &snapshot.test_suites {
        conn.execute(
            "INSERT INTO test_suites (id, name, description, system_prompt, judge_system_prompt, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               description = excluded.description,
               system_prompt = excluded.system_prompt,
               judge_system_prompt = excluded.judge_system_prompt,
               updated_at = excluded.updated_at",
            params![
                suite.id,
                suite.name,
                suite.description,
                suite.system_prompt,
                suite.judge_system_prompt,
                suite.created_at,
                suite.updated_at,
            ],
        ).map_err(|err| err.to_string())?;

        conn.execute("DELETE FROM test_cases WHERE test_suite_id = ?", params![suite.id])
            .map_err(|err| err.to_string())?;

        for (idx, test_case) in suite.test_cases.iter().enumerate() {
            let tags_json = serde_json::to_string(&test_case.metadata.tags)
                .unwrap_or_else(|_| "[]".to_string());

            conn.execute(
                "INSERT INTO test_cases (id, test_suite_id, prompt, expected_output, scoring_method, weight, category, difficulty, tags, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    test_case.id,
                    suite.id,
                    test_case.prompt,
                    test_case.expected_output,
                    test_case.scoring_method,
                    test_case.weight,
                    test_case.metadata.category,
                    test_case.metadata.difficulty,
                    tags_json,
                    idx as i64,
                ],
            ).map_err(|err| err.to_string())?;
        }
    }

    // Delete suites not in snapshot
    let suite_ids: Vec<String> = snapshot.test_suites.iter().map(|s| s.id.clone()).collect();
    if !suite_ids.is_empty() {
        let placeholders: String = suite_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let query = format!("DELETE FROM test_suites WHERE id NOT IN ({})", placeholders);
        let params: Vec<&dyn rusqlite::ToSql> = suite_ids.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
        conn.execute(&query, params.as_slice()).map_err(|err| err.to_string())?;
    } else {
        conn.execute("DELETE FROM test_suites", []).map_err(|err| err.to_string())?;
    }

    // Write runs
    for run in &snapshot.runs {
        let models_json = serde_json::to_string(&run.models)
            .unwrap_or_else(|_| "[]".to_string());
        let params_json = serde_json::to_string(&run.parameters)
            .unwrap_or_else(|_| "{}".to_string());

        conn.execute(
            "INSERT INTO runs (id, test_suite_id, test_suite_name, models, parameters, status, started_at, completed_at, judge_model)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               status = excluded.status,
               completed_at = excluded.completed_at",
            params![
                run.id,
                run.test_suite_id,
                run.test_suite_name,
                models_json,
                params_json,
                run.status,
                run.started_at,
                run.completed_at,
                run.judge_model,
            ],
        ).map_err(|err| err.to_string())?;

        conn.execute("DELETE FROM test_case_results WHERE run_id = ?", params![run.id])
            .map_err(|err| err.to_string())?;

        for result in &run.results {
            let score_json = result.score.as_ref()
                .map(|s| serde_json::to_string(s).unwrap_or_else(|_| "null".to_string()));

            conn.execute(
                "INSERT INTO test_case_results (run_id, test_case_id, model_id, response, token_count, latency_ms, status, error, score, streamed_content)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    run.id,
                    result.test_case_id,
                    result.model_id,
                    result.response,
                    result.token_count,
                    result.latency_ms,
                    result.status,
                    result.error,
                    score_json,
                    result.streamed_content,
                ],
            ).map_err(|err| err.to_string())?;
        }
    }

    // Delete runs not in snapshot
    let run_ids: Vec<String> = snapshot.runs.iter().map(|r| r.id.clone()).collect();
    if !run_ids.is_empty() {
        let placeholders: String = run_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let query = format!("DELETE FROM runs WHERE id NOT IN ({})", placeholders);
        let params: Vec<&dyn rusqlite::ToSql> = run_ids.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
        conn.execute(&query, params.as_slice()).map_err(|err| err.to_string())?;
    } else {
        conn.execute("DELETE FROM runs", []).map_err(|err| err.to_string())?;
    }

    // Update app state
    conn.execute(
        "UPDATE app_state SET active_test_suite_id = ?, current_run_id = ? WHERE id = 1",
        params![snapshot.active_test_suite_id, snapshot.current_run_id],
    ).map_err(|err| err.to_string())?;

    Ok(())
}

// Helper functions for internal use
fn get_all_test_suites_internal(conn: &Connection) -> Result<Vec<TestSuite>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, description, system_prompt, judge_system_prompt, created_at, updated_at FROM test_suites ORDER BY updated_at DESC")
        .map_err(|err| err.to_string())?;

    let suite_rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, i64>(5)?,
                row.get::<_, i64>(6)?,
            ))
        })
        .map_err(|err| err.to_string())?;

    let mut suites = Vec::new();
    for row in suite_rows {
        let (id, name, description, system_prompt, judge_system_prompt, created_at, updated_at) = row.map_err(|err| err.to_string())?;
        let test_cases = get_test_cases_for_suite(conn, &id)?;

        suites.push(TestSuite {
            id,
            name,
            description,
            system_prompt,
            judge_system_prompt,
            test_cases,
            created_at,
            updated_at,
        });
    }

    Ok(suites)
}

fn get_all_runs_internal(conn: &Connection) -> Result<Vec<RunResult>, String> {
    let mut stmt = conn
        .prepare("SELECT id, test_suite_id, test_suite_name, models, parameters, status, started_at, completed_at, judge_model FROM runs ORDER BY started_at DESC")
        .map_err(|err| err.to_string())?;

    let run_rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, i64>(6)?,
                row.get::<_, Option<i64>>(7)?,
                row.get::<_, Option<String>>(8)?,
            ))
        })
        .map_err(|err| err.to_string())?;

    let mut runs = Vec::new();
    for row in run_rows {
        let (id, test_suite_id, test_suite_name, models_json, params_json, status, started_at, completed_at, judge_model) = row.map_err(|err| err.to_string())?;

        let models: Vec<String> = serde_json::from_str(&models_json).unwrap_or_default();
        let parameters: ModelParameters = serde_json::from_str(&params_json)
            .unwrap_or(ModelParameters {
                temperature: 0.7,
                top_p: 1.0,
                max_tokens: 1024,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

        let results = get_results_for_run(conn, &id)?;

        runs.push(RunResult {
            id,
            test_suite_id,
            test_suite_name,
            models,
            parameters,
            results,
            status,
            started_at,
            completed_at,
            judge_model,
        });
    }

    Ok(runs)
}

fn chrono_now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

// ============================================================================
// Main
// ============================================================================

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // Legacy commands (backwards compatible)
            read_snapshot,
            write_snapshot,
            // New normalized commands
            get_all_test_suites,
            save_test_suite,
            delete_test_suite,
            get_all_runs,
            save_run,
            delete_run,
            get_app_state,
            save_app_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
