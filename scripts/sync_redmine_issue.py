import os
import re
import requests

REDMINE_URL = "https://redmine.leedohyun.com"
REDMINE_API_KEY = os.environ.get("REDMINE_API_KEY")
ISSUE_BODY = os.environ.get("ISSUE_BODY", "")
ISSUE_URL = os.environ.get("ISSUE_URL", "")

def main():
    if not REDMINE_API_KEY:
        print("REDMINE_API_KEY is not set. Skipping Redmine sync.")
        return

    # 이슈 본문에서 Ref: Redmine #1234 형태의 태그를 추출합니다.
    match = re.search(r'Ref:\s*Redmine\s*#(\d+)', ISSUE_BODY, re.IGNORECASE)
    if not match:
        print("No Redmine reference found in issue body (expected format: 'Ref: Redmine #1234'). Skipping sync.")
        return

    redmine_issue_id = match.group(1)
    print(f"Found Redmine Issue ID: {redmine_issue_id}")

    headers = {
        "X-Redmine-API-Key": REDMINE_API_KEY,
        "Content-Type": "application/json"
    }

    # Redmine 티켓 상태를 '해결(또는 닫힘)' 상태로 업데이트 (상태 ID는 Redmine 환경에 따라 다를 수 있음, 보통 3=해결됨, 5=닫힘)
    # 여기서는 5번(Closed) 상태로 강제 변경하며, GitHub 이슈 URL을 노트(코멘트)로 추가합니다.
    payload = {
        "issue": {
            "status_id": 5,
            "notes": f"이 티켓과 연관된 GitHub 이슈가 닫혔습니다.\n자세한 사항은 다음 링크를 참조하세요: {ISSUE_URL}"
        }
    }

    update_url = f"{REDMINE_URL}/issues/{redmine_issue_id}.json"
    response = requests.put(update_url, headers=headers, json=payload)

    if response.status_code == 200 or response.status_code == 204:
        print(f"Successfully synced close status to Redmine Issue #{redmine_issue_id}.")
    else:
        print(f"Failed to sync with Redmine. Status code: {response.status_code}, Response: {response.text}")

if __name__ == "__main__":
    main()
