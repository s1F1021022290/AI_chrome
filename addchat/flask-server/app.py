from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import requests

app = Flask(__name__)
CORS(app)
CORS(app, resources={r"/detect": {"origins": "*"}})
# モデルのパス
model_path_roberta = '/opt/AI_chrome/addchat/flask-server/model/results-roberta-4060'
model_path_bert = '/opt/AI_chrome/addchat/flask-server/model/result-bert-4060'

# モデル（デフォルト: RoBERTa）
roberta_model = AutoModelForSequenceClassification.from_pretrained(model_path_roberta)
roberta_tokenizer = AutoTokenizer.from_pretrained(model_path_roberta)

# モデル（デフォルト: BERT）
bert_model = AutoModelForSequenceClassification.from_pretrained(model_path_bert)
bert_tokenizer = AutoTokenizer.from_pretrained(model_path_bert)

# 閾値
threshold = 0.6





@app.route('/switch_model', methods=['POST'])
def switch_model():
    global current_model, tokenizer
    data = request.get_json()
    model_type = data.get('modelType')

    if model_type == 'roberta':
        current_model = AutoModelForSequenceClassification.from_pretrained(model_path_roberta)
        tokenizer = AutoTokenizer.from_pretrained(model_path_roberta)
        return jsonify({'message': 'RoBERTaモデルに切り替えました'})
    elif model_type == 'bert':
        current_model = AutoModelForSequenceClassification.from_pretrained(model_path_bert)
        tokenizer = AutoTokenizer.from_pretrained(model_path_bert)
        return jsonify({'message': 'BERTモデルに切り替えました'})
    elif model_type == 'gpt-4o':
        # ChatGPTはOpenAIのAPIを利用するため、ローカルモデルの切り替えは不要
        return jsonify({'message': 'ChatGPT-4oに切り替えました'})
    elif model_type == 'gpt-4o-mini':
        # ChatGPTはOpenAIのAPIを利用するため、ローカルモデルの切り替えは不要
        return jsonify({'message': 'ChatGPT-4o-miniに切り替えました'})
    else:
        return jsonify({'error': '不正なモデルタイプ'}), 400
    

@app.route('/detect', methods=['POST'])
def detect():
    data = request.get_json()
    text = data['body']['text']
    # モデルタイプを指定（デフォルトでRoBERTa）
    model_type = data.get('body', {}).get('model', 'roberta')  # body内からmodelを取得（デフォルトは'roberta'）
    
    # ChatGPTモデルを使う場合、APIキーが必要
    if model_type == 'gpt-4o':
        api_key = data.get('api_key')
        if not api_key:
            return jsonify({"error": "APIキーが必要です"}), 400
        return detect_scam_with_chatgpt(text, api_key,model_type)
    if model_type == 'gpt-4o-mini':
        api_key = data.get('api_key')
        if not api_key:
            return jsonify({"error": "APIキーが必要です"}), 400
        return detect_scam_with_chatgpt(text, api_key,model_type)
    
    # RoBERTaまたはBERTを使う場合
    if model_type == 'roberta':
        return detect_scam_with_model(roberta_model, roberta_tokenizer, text, threshold)
    elif model_type == 'bert':
        return detect_scam_with_model(bert_model, bert_tokenizer, text, threshold)
    else:
        return jsonify({"error": "不正なモデルタイプ"}), 400
    
def detect_scam_with_model(model, tokenizer, text, threshold):
    inputs = tokenizer(text, return_tensors='pt')
    with torch.no_grad():
        outputs = model(**inputs)
        scores = outputs.logits.softmax(dim=1)
        scam_probability = scores[0][1].item()  # 1が詐欺クラスの確率と仮定
        is_scam = scam_probability >= threshold  # 閾値で判定

    return jsonify({'isScam': is_scam, 'scamProbability': scam_probability})


def detect_scam_with_chatgpt(text, api_key, model_type):
    try:
        # APIのエンドポイント
        url = "https://api.openai.iniad.org/api/v1/chat/completions"
        
        # リクエストヘッダー
        headers = {
            'Authorization': f"Bearer {api_key}",
            'Content-Type': 'application/json'
        }
        
        # リクエストボディ
        body = {
            "model": model_type,  # 使用するモデル
            "messages": [
                {"role": "system", "content": "You are an assistant that identifies scam content in tweets."},
                {"role": "user", "content": f"このテキストはお金関連の詐欺ですか？trueかfalseで答えてください「{text}」"}
            ]
        }

        # POSTリクエストを送信
        response = requests.post(url, headers=headers, json=body)
        
        # レスポンスの確認
        if response.status_code == 200:
            result = response.json()
            message = result['choices'][0]['message']['content']
            is_scam = "true" in message.lower()
            return jsonify({'isScam': is_scam, 'response': message})
        else:
            return jsonify({'error': f"HTTP error: {response.status_code}"}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(port=5000)
