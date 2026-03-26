from playwright.sync_api import sync_playwright
import os

def verify_feature():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Using ignore_https_errors to bypass local Vite https cert warnings
        context = browser.new_context(
            record_video_dir="/home/jules/verification/video",
            ignore_https_errors=True
        )
        page = context.new_page()
        try:
            page.goto("https://localhost:5173/mitra/")
            page.wait_for_timeout(2000)

            # Since mock data is removed, we just need to verify it compiled correctly and loaded.
            page.screenshot(path="/home/jules/verification/verification.png")
            page.wait_for_timeout(1000)

        finally:
            context.close()
            browser.close()

if __name__ == "__main__":
    import os
    os.makedirs("/home/jules/verification/video", exist_ok=True)
    verify_feature()
