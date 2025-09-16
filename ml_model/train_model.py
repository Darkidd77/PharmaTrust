import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
import joblib

# --- 1. Load the Dataset ---
# This step reads the simulated performance data from the CSV file.
try:
    data = pd.read_csv('training_data.csv')
    print("Step 1: Successfully loaded training_data.csv")
except FileNotFoundError:
    print("Error: training_data.csv not found. Please make sure it is in the same directory.")
    exit()

# --- 2. Prepare the Data ---
# We separate the data into our features (the inputs the model will learn from)
# and the target label (the answer we want it to predict).
features = ['Deviation_Frequency', 'Deviation_Severity', 'Downtime_Frequency']
target = 'Is_Trustworthy'

X = data[features]
y = data[target]

# Split the data into a training set (to teach the model) and a testing set
# (to evaluate how well it learned). The test_size=0.2 means 20% of the data
# will be reserved for testing.
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print("Step 2: Data has been prepared and split into training and testing sets.")

# --- 3. Train the Machine Learning Model ---
# We create an instance of the Logistic Regression model.
model = LogisticRegression()

# We then train the model using the .fit() method on our training data.
# This is where the model "learns" the patterns.
model.fit(X_train, y_train)
print("Step 3: Model has been successfully trained.")

# --- 4. Evaluate the Model ---
# We use the trained model to make predictions on the unseen test data.
y_pred = model.predict(X_test)

# We compare the model's predictions to the actual answers to calculate its accuracy.
accuracy = accuracy_score(y_test, y_pred)
print(f"Step 4: Model evaluated with an accuracy of: {accuracy:.2%}")

# --- 5. Save the Trained Model ---
# We save the trained model object to a file using joblib.
# This file ('trust_model.pkl') can now be loaded by our prediction API
# without needing to be retrained.
joblib.dump(model, 'trust_model.pkl')
print("Step 5: Model successfully saved to trust_model.pkl")
