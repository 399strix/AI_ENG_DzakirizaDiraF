import './Loading.css'
import { useState } from 'react'
import Loading from './Loading'

interface ChatProps{
    send: string,
    recieve: string
}

export const Chat: React.FC<ChatProps> = () => {
    const [query, setQuery] = useState("");
    const [result, setResult] = useState("");
    const [isLoading, setLoading] = useState(false);

    const ChatLLM = async () => {
        setLoading(true)
        const res = await fetch("http://localhost:3000/rag-service/find-query", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ input: query }),
        });
        const data = await res.json();
        setResult(data.result);
        setLoading(false)
    }

    return (
        <div>
            {isLoading ? (<Loading message="Finding result" />) : 
                (
                    <div>
                        <input onChange={(e) => setQuery(e.target.value)} />
                        <button onClick={ChatLLM}>Ask</button>
                        <p>{result}</p>
                    </div>
                )}
        </div>
    )
}

export default Chat