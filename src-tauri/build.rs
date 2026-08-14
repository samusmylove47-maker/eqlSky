fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(&[
            "overlay_set_visible",
            "overlay_set_click_through",
            "read_text_path",
            "stat_text_path",
        ])),
    )
    .expect("failed to run tauri-build");
}
