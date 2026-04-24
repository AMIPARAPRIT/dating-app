import pandas as pd
from sklearn.linear_model import LinearRegression
import joblib

# Mock dataset for training compatibility
# Features: interestMatch (0-1), ageDiff, sameIntent(0/1), lifestyleMatch(0/1), distance(km)
# Target: matchSuccess(0-1 probability scale, which is then trained against)
# We will use simple deterministic labels with some noise
data = {
    'interestMatch':  [1.0, 0.8, 0.0, 1.0, 0.5, 0.1, 0.9, 0.2, 0.8, 0.0, 0.7, 0.3],
    'ageDiff':        [1,   5,   20,  2,   10,  15,  3,   8,   4,   18,  5,   12],
    'sameIntent':     [1,   1,   0,   0,   1,   0,   1,   1,   0,   0,   1,   0],
    'lifestyleMatch': [1,   1,   0,   1,   0,   0,   1,   0,   1,   0,   1,   0],
    'distance':       [5,   20,  1000,10,  50,  500, 15,  80,  25,  800, 12,  200],
    
    # Let's say: 
    # High interest (0.8+) = strong positive
    # Same intent = strong positive
    # Lifestyle match = moderate positive
    # AgeDiff > 10 = negative
    # Distance > 100 = strong negative
    'matchSuccess':   [0.95, 0.85, 0.05, 0.75, 0.50, 0.10, 0.90, 0.35, 0.70, 0.05, 0.80, 0.20]
}

df = pd.DataFrame(data)

X_train = df[['interestMatch', 'ageDiff', 'sameIntent', 'lifestyleMatch', 'distance']]
y_train = df['matchSuccess']

model = LinearRegression()
model.fit(X_train, y_train)

joblib.dump(model, "model.pkl")
print("Model trained and saved to model.pkl successfully.")
