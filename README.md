# PromptWars

🌾 AgroIntent — Voice/Photo to Farm Action
The pitch: A commercial farmer speaks or uploads a photo of their field/crop, and the app instantly returns a structured action plan — irrigation schedule, pesticide recommendation, yield risk alert, etc.
How it maps to the challenge
Challenge RequirementYour AppUnstructured inputVoice note or crop photoComplex systemsWeather API + soil data + market pricesStructured outputActionable farm decision with reasoningSocietal benefitFood security, reduced crop loss

App: AgroIntent
What it does: Farmer uploads a crop photo or types a problem → Gemini analyzes it → Returns a structured action card (diagnosis, action, urgency)
Stack: React (CRA) + Gemini 1.5 Flash API (called directly from frontend)
No backend, no auth, no DB
