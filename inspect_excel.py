import pandas as pd
import json

file_path = "Agent_Pricing_Calculator_v3_Final - Copy.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    print("Sheet names:", xl.sheet_names)
    
    for sheet in xl.sheet_names:
        df = xl.parse(sheet)
        print(f"\n--- Sheet: {sheet} ---")
        print("Shape:", df.shape)
        # Print first 30 rows and all columns, replacing NaNs with empty strings for readability
        print(df.head(30).fillna('').to_string())
except Exception as e:
    print(f"Error reading file: {e}")
