from flask import Flask, request, jsonify
import joblib
import pandas as pd

# Initialize the Flask application
app = Flask(__name__)

# --- Load the Trained Model ---
# This line runs once when the server starts. It loads the saved .pkl file
# into memory so it's ready to make predictions.
try:
    model = joblib.load('trust_model.pkl')
    print("Model loaded successfully.")
except FileNotFoundError:
    print("Error: trust_model.pkl not found. Please run train_model.py first.")
    model = None

# --- Define the Prediction Endpoint ---
# This creates an API endpoint that can be accessed at /assess-partner
@app.route('/assess-partner', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model is not loaded.'}), 500

    try:
        # Get the JSON data sent in the request
        json_data = request.get_json()
        
        # Convert the incoming JSON data into a pandas DataFrame
        # This is necessary because the scikit-learn model expects its input
        # in the same format it was trained on.
        data_df = pd.DataFrame(json_data, index=[0])
        
        # Ensure the column order is the same as the training data
        features = ['Deviation_Frequency', 'Deviation_Severity', 'Downtime_Frequency']
        data_df = data_df[features]

        # Use the loaded model to make a prediction
        prediction = model.predict(data_df)
        
        # The model outputs a 0 or a 1. We convert this into a human-readable response.
        if prediction[0] == 1:
            result = "Yes"
        else:
            result = "No"
            
        # Return the final prediction as a JSON response
        return jsonify({'trustworthy': result})

    except Exception as e:
        return jsonify({'error': str(e)}), 400

# --- Start the Server ---
# This block makes the script runnable. It starts the Flask development server.
# host='0.0.0.0' makes the server accessible from other devices on the network (like your Node.js backend).
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
