
import React, { useState, useMemo } from 'react';
import { Document, BibliometricData, Language } from '../types';
import { runBibliometricAnalysis } from '../services/llmService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, Search, Lightbulb } from 'lucide-react';

interface BibliometricViewProps {
  documents: Document[];
  language: Language;
}

const COLORS = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777'];

const BibliometricView: React.FC<BibliometricViewProps> = ({ documents, language }) => {
  const [objective, setObjective] = useState('');
  const [data, setData] = useState<BibliometricData | null>(null);
  const [loading, setLoading] = useState(false);

  const successDocs = documents.filter(d => d.status === 'SUCCESS');

  // Generate suggestions based on analyzed data
  const suggestions = useMemo(() => {
    if (successDocs.length === 0) return [];
    
    // Collect all keywords based on current language preference if possible, fallback to EN for consistency in counting
    const allKeywords: string[] = [];
    successDocs.forEach(doc => {
      const kws = doc.analysis?.keywords;
      if (!kws) return;
      
      // Prefer the language selected by user for the UI suggestions
      const targetKeywords = language === 'vi' ? kws.vi : kws.en;
      if (targetKeywords && targetKeywords.length > 0) {
          allKeywords.push(...targetKeywords);
      } else if (kws.en) {
          allKeywords.push(...kws.en);
      }
    });

    // Count frequency
    const counts: {[key: string]: number} = {};
    allKeywords.forEach(k => { 
        const normalized = k.trim().toLowerCase();
        counts[normalized] = (counts[normalized] || 0) + 1; 
    });
    
    // Top 5 keywords
    const topKeywords = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Increased to 5 for variety
      .map(k => k[0]); // These are lowercase now

    // Helper to title case for display
    const titleCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

    // Customize suggestion text based on language
    if (language === 'vi') {
        const list = [
          "Tổng quan các phương pháp nghiên cứu",
          "Phân tích các khoảng trống tri thức",
          "Xu hướng nghiên cứu theo thời gian"
        ];
        topKeywords.forEach(kw => list.push(`Phân tích xu hướng về chủ đề "${titleCase(kw)}"`));
        return list;
    } else {
        const list = [
          "Overview of research methodologies used",
          "Analysis of current knowledge gaps",
          "Research trends over time"
        ];
        topKeywords.forEach(kw => list.push(`Deep dive into topic "${titleCase(kw)}"`));
        return list;
    }

  }, [successDocs, language]);

  const handleAnalyze = async () => {
    if (!objective.trim() || successDocs.length === 0) return;
    setLoading(true);
    try {
      const result = await runBibliometricAnalysis(documents, objective, language);
      setData(result);
    } catch (e) {
      alert('Analysis failed. Check console.');
    } finally {
      setLoading(false);
    }
  };

  if (successDocs.length === 0) {
    return <div className="text-center p-10 text-slate-500">
        {language === 'vi' ? 'Vui lòng phân tích ít nhất một tài liệu trước.' : 'Please analyze at least one document first.'}
    </div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
            {language === 'vi' ? 'Phân tích Trắc lượng Thư mục' : 'Bibliometric Analysis'}
        </h2>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder={language === 'vi' ? "Nhập mục tiêu (vd: Tìm xu hướng...)" : "Enter objective (e.g., Find research trends...)"}
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !objective}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Search size={18} />}
            {language === 'vi' ? 'Phân tích' : 'Analyze'}
          </button>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="flex items-start gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-50">
             <Lightbulb className="text-amber-500 mt-1 flex-shrink-0" size={18} />
             <div className="flex flex-wrap gap-2">
               {suggestions.map((s, i) => (
                 <button 
                    key={i} 
                    onClick={() => setObjective(s)}
                    className="text-xs bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-full transition-all border border-slate-200 hover:border-blue-200 shadow-sm"
                 >
                    {s}
                 </button>
               ))}
             </div>
          </div>
        )}
      </div>

      {data && (
        <div className="animate-fade-in space-y-6">
          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96 flex flex-col">
              <h3 className="font-semibold text-slate-700 mb-4">{language === 'vi' ? 'Phân bố Chủ đề' : 'Topic Distribution'}</h3>
              <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topicDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <XAxis dataKey="name" tick={{fontSize: 11}} interval={0} angle={-30} textAnchor="end" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96 flex flex-col">
              <h3 className="font-semibold text-slate-700 mb-4">{language === 'vi' ? 'Phân bố Phương pháp' : 'Methodology Distribution'}</h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={data.methodologyDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                        {data.methodologyDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Text Summary */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-2">{language === 'vi' ? 'Phân tích Tổng quan' : 'Overall Analysis'}</h3>
            <p className="text-slate-600 leading-relaxed whitespace-pre-line">{data.overallAnalysis}</p>
            
            <h3 className="font-semibold text-slate-700 mt-6 mb-2">{language === 'vi' ? 'Khoảng trống Tri thức' : 'Research Gaps'}</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
                {data.knowledgeGaps.map((gap, i) => <li key={i}>{gap}</li>)}
            </ul>
          </div>

           {/* Table */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <h3 className="font-semibold text-slate-700 mb-4">{language === 'vi' ? 'Bảng tổng hợp bài báo tiêu biểu' : 'Summary Table of Key Papers'}</h3>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 text-slate-500 text-sm uppercase">
                        <th className="p-3 border-b whitespace-nowrap">{language === 'vi' ? 'Tiêu đề' : 'Title'}</th>
                        <th className="p-3 border-b whitespace-nowrap">{language === 'vi' ? 'Năm' : 'Year'}</th>
                        <th className="p-3 border-b">{language === 'vi' ? 'Phát hiện chính' : 'Key Findings'}</th>
                    </tr>
                </thead>
                <tbody>
                    {data.summaryTable.map((row, idx) => (
                        <tr key={idx} className="border-b last:border-0 text-sm hover:bg-slate-50">
                            <td className="p-3 font-medium text-slate-800">{row.title}</td>
                            <td className="p-3 text-slate-600">{row.year}</td>
                            <td className="p-3 text-slate-600">{row.keyFinding}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default BibliometricView;
