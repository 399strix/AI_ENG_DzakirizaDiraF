# AI-Engineer-DzakirizaDF
This is Technical test answer for AI Engineer role @Shopee

# Engineering Knowledge AI Agent Test 
1. Rest API is standard communication over HTTP that is isolated each request, so should defined it manually in AI integeration. On the other hand, MCP stands as protocol for bridging AI with capabilities(tools, prompts, resources) that is stateful, so it maintaining context accross a session with JSON-RPC format.
2. AI as a base model can perform task that typically requires human intelligence, however using Rest API allows AI model to be exposed as services or even orchestrating multiple AI model. In AI-based systetm, MCP works perfectly to leverage AI Capability, such as calling DB queries, using external tools, and even calling other AI model with also knowing the context.
3. Improving AI agent response can follow some approaches, such as Retrieval Augmented Generation (adding more knowledge for specific answer), Prompting (Guidelines AI to do particular task), Fine-tune(Train RAW AI Model with specific input, and output expectation), and Feedbaack response (Store the user feedback based on AI's response).
4. Using docker or containerized environment can provide isolated environment which is useful to make sure AI services are in consistem dependency, it also support microservice for vector db, embeddings service, or even customized ML model. In some container is also possible to run our self-hosted model with GPU inside, so more portable.
5. First, Data Collection (collecting specific data contained instruction, input, and ouput in json format), Data cleaning (ensure the training data is relevant, accurate, consistent, and complete), Choos base model (comparing LLM model that suitable for the case like maximum token input / input format / model availability), Train (run the training in any cloud or local with specific approach like LoRA), Evaluation (test the trained model result to avoid overfitting and hallucinatioon)

# Coding TEST
- Requirement:
  1. CSV parsing (large and small data), VDB using cosine similarity
  2. Platform:
    1. Upload CSV -> List table
    2. Upload Recipt -> extract -> convert into vector -> Qdrant VDB -> User query -> LLM -> (Rest / MCP) knowledge -> Result
  3. Docker using CI/CD pipeline local hosted
- Tech stack : Qdrant VDB, Local Docker, React UI, Nodejs + Typescript, Ollama model (LLM and embeddings), Github Action CI/CD, ComputerVision library
