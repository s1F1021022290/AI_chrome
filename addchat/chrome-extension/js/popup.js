document.getElementById("saveBtn").addEventListener("click", () => {
  const selectedModel = document.getElementById("modelSelect").value;

  // モデル選択をChromeのストレージに保存
  chrome.storage.sync.set({ selectedModel: selectedModel }, () => {
    alert("選択したモデルが保存されました！");

    // サーバーに選択されたモデルを通知
    fetch('https://shimizu-ai-chrome-1023547087113.asia-northeast1.run.app/switch_model', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ modelType: selectedModel }), // 選択されたモデルを送信
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log(data.message); // サーバーからの応答メッセージを表示
        alert(`モデルが${selectedModel}に切り替わりました！`);
      })
      .catch((error) => {
        console.error('モデルの切り替え中にエラーが発生しました:', error);
        alert('モデルの切り替えに失敗しました。サーバーを確認してください。');
      });
  });
});

// ページ読み込み時に保存されたモデルを取得して選択
window.onload = () => {
  chrome.storage.sync.get("selectedModel", (data) => {
    if (data.selectedModel) {
      document.getElementById("modelSelect").value = data.selectedModel;
    }
  });
};
