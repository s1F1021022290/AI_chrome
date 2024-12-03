let debounceTimeout;
let tweetProcessing = new Set(); // 処理中のツイートを追跡
const proxyUrl = 'https://shimizu-ai-chrome-1023547087113.asia-northeast1.run.app/detect';  // Flaskサーバーのエンドポイン
let apiKey;

// APIキーを取得する関数
async function getApiKey() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get("apiKey", (data) => {
      if (data.apiKey) {
        resolve(data.apiKey);
      }
    });
  });
}

// detectScam関数
async function detectScam(text, modelType) {
  
  try {

    let body = { model: modelType, text: text };
    let requestBody = { body: body };
    // ChatGPTの場合はプロンプトをサーバーサイドで処理
    if (modelType === "gpt-4o" || modelType === "gpt-4o-mini") {
      apiKey = await getApiKey();  // ストレージからAPIキーを取得
      requestBody = { api_key: apiKey, body: body };
    }
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (modelType === "gpt-4o" || modelType === "gpt-4o-mini") {
      // サーバーからの結果
      const isScam = result.isScam;  // 直接isScamを取得
      return isScam;
  }

    // RoBERTa と BERT の場合の結果処理
    return result.isScam;

  } catch (error) {
    return false;
  }
}


// 警告アイコンを追加する関数
function addWarningIcon(tweetContainer) {
  // すでにアイコンが追加されている場合は処理しない
  if (tweetContainer.querySelector('.warning-icon')) return;
  
  const warningIcon = document.createElement('span');
  warningIcon.classList.add('warning-icon');
  warningIcon.innerText = '⚠️';
  
  // アイコンのスタイルを設定
  warningIcon.style.cursor = 'pointer';
  warningIcon.style.marginLeft = '15px';
  warningIcon.style.marginTop = '10px';

  // モーダルを作成
  const modal = document.createElement('div');
  modal.classList.add('warning-modal');
  modal.innerText = '詐欺の可能性があります。このツイートには注意してください。';
  
  // モーダルのスタイルを設定
  modal.style.display = 'none';
  modal.style.position = 'absolute';
  modal.style.backgroundColor = '#ffffb3';
  modal.style.border = '1px solid red';
  modal.style.padding = '10px';
  modal.style.borderRadius = '5px';
  modal.style.zIndex = '100';
  modal.style.top = '20px';
  modal.style.left = '70px';
  
  // アイコンにホバーした際にモーダルを表示
  warningIcon.addEventListener('mouseenter', () => {
    modal.style.display = 'block';
  });

  // ホバーを外したらモーダルを非表示に
  warningIcon.addEventListener('mouseleave', () => {
    modal.style.display = 'none';
  });

  tweetContainer.appendChild(warningIcon);
  tweetContainer.appendChild(modal);
}

function removeWarningIcon(tweetContainer) {
  const warningIcon = tweetContainer.querySelector('.warning-icon');
  const warningModal = tweetContainer.querySelector('.warning-modal');
  
  if (warningIcon) warningIcon.remove();
  if (warningModal) warningModal.remove();
}

const processedTweetIds = new Set();

function monitorTweets() {
  const tweets = document.querySelectorAll('div[data-testid="tweetText"]');

  if (tweets.length === 0) {
    return;
  }

  tweets.forEach(tweet => {
    const text = tweet.innerText;
    const tweetContainer = tweet.closest('div[id^="id__"]');
    const tweetalertposition = tweet.closest('article');

    if (!tweetContainer) {
      return;
    }

    const tweetId = tweetContainer.id;

    if (processedTweetIds.has(tweetId)) return;

    processedTweetIds.add(tweetId);

    chrome.storage.sync.get("selectedModel", (data) => {
      const modelType = data.selectedModel || "roberta"; 
      detectScam(text, modelType)
        .then(isScam => {
          if (isScam) {
            tweetalertposition.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
            addWarningIcon(tweetalertposition);
          } else {
            tweetalertposition.style.backgroundColor = '';
            removeWarningIcon(tweetalertposition);
          }
        })
        .catch(error => {
        });
    });
  });
}

window.addEventListener('load', () => {
  monitorTweets();

  const observer = new MutationObserver((mutationsList) => {
    mutationsList.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.querySelector('[data-testid="tweetText"]')) {
            monitorTweets();
          }
        });
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
});
