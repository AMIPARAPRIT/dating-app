from flask import Flask, request, jsonify
import joblib

app = Flask(__name__)
model = joblib.load("model.pkl")

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        features = [[
            float(data.get("interestMatch", 0)),
            float(data.get("ageDiff", 0)),
            float(data.get("sameIntent", 0)),
            float(data.get("lifestyleMatch", 0)),
            float(data.get("distance", 0))
        ]]
        
        result = model.predict(features)[0]
        # Bounding the result between 0 and 1
        result = max(0.0, min(1.0, result))
        
        return jsonify({
            "compatibility": round(result * 100)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(port=5001, debug=True)
