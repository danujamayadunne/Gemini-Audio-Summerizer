'use client'
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { TextureButton } from './button';
import { Input } from './ui/input';

export default function AudioSummarize() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioName, setAudioName] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="flex justify-between main">

      <div style={{ height: "46px" }}>
        <form className="flex items-center gap-2" onSubmit={handleSubmit}>
          <TextureButton onClick={() => document.getElementById('audioinput')?.click()}>
            <input id='audioinput' type="file" accept="audio/*" hidden onChange={handleFileChange} />
            <p>{audioName || 'Upload Audio'}</p>
          </TextureButton>
          <div>
            <TextureButton style={{ width: "200px" }} variant='secondary' type="submit" disabled={!audioFile || loading}>
              {loading ? 'Summarizing...' : 'Summarize Audio'}
            </TextureButton>
          </div>
        </form>
        <Input className="input absolute bottom-10" placeholder='Ask follow-up question' />
      </div>

      <div className="summery overflow-auto">
        <p className="font-semibold tracking-tight">Summerization</p>
        {summary && (
          <ReactMarkdown className="pt-5"
            children={summary}
          />
        )}
      </div>

    </div>
  );
}
