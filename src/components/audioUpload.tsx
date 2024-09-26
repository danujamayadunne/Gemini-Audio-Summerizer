'use client'
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { TextureButton } from './button';
import { Input } from './ui/input';
import { AudioLines, SendHorizonal, Sparkles } from 'lucide-react';

export default function AudioSummarize() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioName, setAudioName] = useState('');
  const [summary, setSummary] = useState('');
  const [question, setQuestion] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showTimer, setShowTimer] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAudioFile(e.target.files ? e.target.files[0] : null);
    setAudioName(e.target.files ? e.target.files[0].name : '');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!audioFile) return;

    const formData = new FormData();
    formData.append('file', audioFile);

    setLoading(true);
    setShowTimer(true);
    setTimer(0);

    try {
      const response = await fetch('/api/audio', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Error:', error);
      setSummary('Error summarizing the audio.');
    } finally {
      setLoading(false);
    }
  };

  //Ngl, I used Gemini to build follow-up chat. LOL.
  const handleQuestionSubmit = async () => {
    if (!question || !summary) return;

    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: `${summary}\n\nQuestion: ${question}` }),
      });

      const data = await response.json();
      setChatResponse(data.response);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setChatLoading(false);
      setQuestion('');
    }
  };

  //Calculate Response Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (loading && showTimer) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 1000);
    } else {
      clearInterval(interval || 0);
    }
    return () => clearInterval(interval || 0);
  }, [loading, showTimer]);

  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <div className="flex flex-col lg:flex-row justify-between main">
      <div style={{ height: "46px" }}>
        <form className="flex items-center gap-2" onSubmit={handleSubmit}>
          <TextureButton variant='secondary' onClick={() => document.getElementById('audioinput')?.click()}>
            <input id='audioinput' type="file" accept="audio/*" hidden onChange={handleFileChange} />
            <p>{audioName || <span className="flex gap-2 items-center"><AudioLines size={19} /> Upload Audio</span>}</p>
          </TextureButton>
          <div>
            <TextureButton style={{ width: "190px" }} type="submit" disabled={!audioFile || loading}>
              {loading ? 'Summarizing...' : <span className="flex gap-2 items-center"><Sparkles size={19} /> Summerize Audio</span>}
            </TextureButton>
          </div>
        </form>

        <div className="mt-4">
          <div className="hidden lg:flex response absolute overflow-y-auto" style={{ bottom: "160px", height: "460px", width: "360px" }}>
            {chatResponse && (
              <div>
                <p className="font-semibold tracking-tight">Response</p>
                <ReactMarkdown className="pt-5" children={chatResponse} />
              </div>
            )}
          </div>
          <div className="absolute bottom-5 lg:bottom-10">
            <Input
              className="input"
              placeholder="Ask follow-up question...."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={chatLoading}
            />
            <TextureButton className="w-full mt-2"
              style={{ height: "46px" }}
              onClick={handleQuestionSubmit}
              disabled={!question || chatLoading}
            >
              {chatLoading ? 'Asking...' :<span className="flex gap-2 items-center">Ask Question<SendHorizonal size={19} /></span>}
            </TextureButton>
          </div>
        </div>
      </div>

      <div className="summery overflow-auto">
        <div className="flex gap-2 items-center">
          <p className="font-semibold tracking-tight">Summarization</p>
          {showTimer && (
            <p className="text-sm text-gray-500">Summarizing... {formatTimer(timer)}</p>
          )}
        </div>
        {summary && (
          <ReactMarkdown className="pt-5" children={summary} />
        )}
      </div>

    </div>
  );
}
