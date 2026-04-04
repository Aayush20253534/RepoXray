import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()

# Using the provided key as a fallback, but prioritizing the .env file
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")

# Initialize the LangChain LLM
llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model="llama-3.3-70b-versatile",
    temperature=0.3
)