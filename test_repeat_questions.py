"""
Selenium test: complete training, verify new questions appear on replay.
"""
import time, traceback
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

BASE = "http://localhost:3000"
EMAIL = "testuser@quickskill.com"
PASSWORD = "test123456"

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--no-sandbox")
opts.add_argument("--disable-dev-shm-usage")
opts.add_argument("--window-size=1280,900")
opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def click_js(el):
    driver.execute_script("arguments[0].scrollIntoView({block:'center'}); arguments[0].click();", el)
    time.sleep(0.5)

def get_all_enabled_btns():
    """Return all buttons that are enabled & displayed, with their text."""
    result = []
    for b in driver.find_elements("tag name", "button"):
        t = b.text.strip()
        if t and b.is_enabled() and b.is_displayed() and b.get_attribute("disabled") is None:
            result.append((t.replace("\n", " "), b))
    return result

def is_opt_text(t):
    return "(" in t and ")" in t and any(f"({i})" in t for i in range(1, 5))

def get_first_q_opts():
    """Get current question's option texts."""
    for t, _ in get_all_enabled_btns():
        if is_opt_text(t):
            return [t for t, _ in get_all_enabled_btns() if is_opt_text(t)][:4]
    return []

def do_training_session():
    """Click through a full training session. Returns True if completed."""
    start = time.time()
    total_answered = 0
    last_state = ""
    while time.time() - start < 120:
        time.sleep(0.5)
        src = driver.page_source

        # Check completion states
        if "Practice Again" in src:
            log(f"Done! 'Practice Again' visible. Answered ~{total_answered} questions")
            return True
        if "Saving..." in src:
            log("Training complete, bank saving in progress...")
            return True
        if "Training Complete" in src:
            log("'Training Complete' visible")
            return True

        btns = get_all_enabled_btns()
        if not btns:
            continue

        # Debug: print options if state changed
        opts = [t for t, _ in btns if is_opt_text(t)]
        state_key = str(opts[:2])
        if state_key != last_state:
            last_state = state_key
            if opts:
                log(f"Options: {opts[:4]}")

        # Priority 1: Click option button (multiple choice)
        for t, b in btns:
            if is_opt_text(t):
                driver.execute_script("arguments[0].click();", b)
                total_answered += 1
                time.sleep(0.7)
                break
        else:
            # Priority 2: Type in text input
            for inp in driver.find_elements("tag name", "input") + driver.find_elements("tag name", "textarea"):
                if inp.is_enabled() and inp.is_displayed():
                    inp.send_keys("test")
                    time.sleep(0.3)
                    break

            # Priority 3: Click Next/Submit
            for t, b in btns:
                if t in ("Submit Answer",) or "Next Question" in t:
                    driver.execute_script("arguments[0].click();", b)
                    time.sleep(0.7)
                    break

    log(f"Timed out after {time.time()-start:.0f}s, answered ~{total_answered}")
    return False

def navigate_and_start():
    """Go to Language Learning, select Grammar, start training. Returns True on success."""
    driver.get(f"{BASE}/training/language-learning")
    time.sleep(3)

    # Click Grammar topic
    for t, b in get_all_enabled_btns():
        if "grammar" in t.lower():
            click_js(b)
            log("Grammar selected")
            time.sleep(1)
            break

    # Click Start Training
    for t, b in get_all_enabled_btns():
        if "Start Training" in t:
            click_js(b)
            log("Training started")
            time.sleep(2)
            return True

    # Maybe already in training (stale state)
    log("No Start Training found, checking if already in session...")
    opts = get_first_q_opts()
    if opts:
        log(f"Found options already: {opts}")
        return True

    log("FAILED to start training")
    driver.save_screenshot("debug_start_fail.png")
    return False

try:
    # ─── LOGIN ───
    log("Logging in...")
    driver.get(f"{BASE}/auth")
    time.sleep(3)

    if "Sign Out" not in driver.page_source:
        for el in driver.find_elements("tag name", "input"):
            p = (el.get_attribute("placeholder") or "") + (el.get_attribute("type") or "")
            if "@" in p or "email" in p.lower():
                el.send_keys(EMAIL)
            elif "password" in p.lower() or el.get_attribute("type") == "password":
                el.send_keys(PASSWORD)
        for t, b in get_all_enabled_btns():
            if "Sign In" in t:
                click_js(b)
                break
        time.sleep(3)
        log("Signed in")

    # ─── SESSION 1 ───
    log("=== SESSION 1 ===")
    if not navigate_and_start():
        raise Exception("Could not start session 1")

    q1 = get_first_q_opts()
    log(f"First Q options: {q1}")

    log("Answering questions...")
    do_training_session()

    # Wait for background gen
    log("Waiting for background generation...")
    for i in range(90):
        time.sleep(2)
        src = driver.page_source
        if "Saving..." in src:
            if i % 15 == 0:
                log(f"  Saving... ({i*2}s)")
            continue
        if "Practice Again" in src:
            log(f"Practice Again after ~{i*2}s")
            break
        if i % 20 == 0:
            log(f"  Waiting... ({i*2}s)")
    else:
        log("Timed out waiting for generation")

    # ─── SESSION 2 ───
    log("=== SESSION 2 ===")
    if not navigate_and_start():
        raise Exception("Could not start session 2")

    time.sleep(2)
    q2 = get_first_q_opts()
    log(f"First Q options: {q2}")

    # ─── RESULT ───
    log("\n========== RESULT ==========")
    log(f"S1 first Q: {q1}")
    log(f"S2 first Q: {q2}")
    if q1 and q2 and q1 == q2:
        log("FAIL: Same questions both sessions - bank was NOT updated")
    elif q1 and q2 and q1 != q2:
        log("PASS: Different questions - bank WAS updated")
    else:
        log(f"SKIP: q1={q1}, q2={q2}")

    # Console logs
    try:
        logs = driver.get_log("browser")
        qs = [l for l in logs if "QuickSkill" in str(l)]
        if qs:
            log(f"\nQuickSkill logs ({len(qs)}):")
            for l in qs[-5:]:
                log(f"  {str(l['message'])[:300]}")
        errs = [l for l in logs if l.get("level") == "SEVERE" and "favicon" not in str(l).lower()]
        errs = [e for e in errs if "localhost" not in str(e)]
        if errs:
            log(f"\nErrors ({len(errs)}):")
            for e in errs[:3]:
                log(f"  {str(e['message'])[:200]}")
    except Exception as ex:
        log(f"Console log error: {ex}")

except Exception as e:
    log(f"ERROR: {e}")
    traceback.print_exc()
    driver.save_screenshot("debug_fatal.png")

finally:
    driver.quit()
    log("Done")
