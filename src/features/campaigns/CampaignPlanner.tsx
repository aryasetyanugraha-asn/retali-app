import React, { useState } from 'react';
import { functionsService, dbService } from '../../services/firebaseService';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Check, Loader2, Plus, Send } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface MonthBreakdown {
  month_name: string;
  monthly_theme: string;
  key_goal: string;
}

interface CampaignOption {
  theme: string;
  monthly_breakdown: MonthBreakdown[];
}

interface PostIdea {
  caption: string;
  image_prompt: string;
}

export const CampaignPlanner: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [startDate, setStartDate] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [options, setOptions] = useState<{ option_a: CampaignOption, option_b: CampaignOption, option_c: CampaignOption } | null>(null);

  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const [monthPosts, setMonthPosts] = useState<Record<string, PostIdea[]>>({});
  const [loadingMonths, setLoadingMonths] = useState<Record<string, boolean>>({});
  const [schedulingMonths, setSchedulingMonths] = useState<Record<string, boolean>>({});

  const handleGenerateOptions = async () => {
    if (!title || !targetAudience || !startDate) {
      alert('Please fill all fields');
      return;
    }

    setLoadingOptions(true);
    setStep(2);

    try {
      const result: any = await functionsService.generateCampaignOptions(title, targetAudience, startDate);
      if (result.success && result.data) {
        setOptions(result.data);
        setStep(3);
      } else {
        throw new Error('Invalid response from AI');
      }
    } catch (error) {
      console.error('Error generating options:', error);
      alert('Failed to generate options. Please try again.');
      setStep(1);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleSelectOption = async (optionKey: 'A' | 'B' | 'C') => {
    if (!user) return;
    setSelectedOption(optionKey);

    try {
      const payload = {
        title,
        target_audience: targetAudience,
        start_date: Timestamp.fromDate(new Date(startDate)),
        selected_option: optionKey,
        options,
        status: "DRAFT"
      };

      const docRef = await dbService.addDocument(`users/${user.uid}/campaigns`, payload);
      setCampaignId(docRef.id);
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert('Failed to save campaign. Please try again.');
    }
  };

  const handleBreakdownMonth = async (monthName: string, monthlyTheme: string, keyGoal: string) => {
    if (!selectedOption || !options) return;

    const optionKey = `option_${selectedOption.toLowerCase()}` as keyof typeof options;
    const optionTheme = options[optionKey].theme;

    setLoadingMonths(prev => ({ ...prev, [monthName]: true }));

    try {
      const result: any = await functionsService.generateMonthBreakdown(title, optionTheme, monthName, monthlyTheme, keyGoal);
      if (result.success && result.data) {
        setMonthPosts(prev => ({ ...prev, [monthName]: result.data }));
      }
    } catch (error) {
      console.error('Error breaking down month:', error);
      alert('Failed to generate posts for this month.');
    } finally {
      setLoadingMonths(prev => ({ ...prev, [monthName]: false }));
    }
  };

  const handlePushToSchedule = async (monthName: string) => {
    if (!user || !campaignId) return;
    const posts = monthPosts[monthName];
    if (!posts || posts.length === 0) return;

    setSchedulingMonths(prev => ({ ...prev, [monthName]: true }));

    try {
      const startMonthDate = new Date(startDate);
      // Rough approximation: just spread them over next 30 days starting from startDate
      // A more robust implementation would parse `monthName` to get the exact start date of that month.
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const scheduledDate = new Date(startMonthDate);
        // spread posts e.g. every 2-3 days
        scheduledDate.setDate(scheduledDate.getDate() + (i * 2) + 1);

        await dbService.addDocument('scheduledPosts', {
          userId: user.uid,
          platform: 'instagram', // default, can be enhanced
          content: post.caption,
          image_prompt: post.image_prompt, // storing prompt for now
          status: 'PENDING',
          scheduledAt: Timestamp.fromDate(scheduledDate),
          createdAt: Timestamp.now(),
          campaignId: campaignId
        });
      }

      alert(`Successfully scheduled ${posts.length} posts for ${monthName}`);
    } catch (error) {
      console.error('Error scheduling posts:', error);
      alert('Failed to schedule posts.');
    } finally {
      setSchedulingMonths(prev => ({ ...prev, [monthName]: false }));
    }
  };

  const renderOptionCard = (key: 'A' | 'B' | 'C', option: CampaignOption | undefined) => {
    if (!option) return null;

    const isSelected = selectedOption === key;

    return (
      <div className={`bg-white rounded-xl shadow-sm border-2 transition-all p-6 ${isSelected ? 'border-emerald-500 ring-4 ring-emerald-50' : 'border-gray-200 hover:border-emerald-300 cursor-pointer'}`}
           onClick={() => !selectedOption && handleSelectOption(key)}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Opsi {key}: {option.theme}</h3>
          {isSelected && <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-full"><Check className="w-5 h-5" /></div>}
        </div>

        <div className="space-y-4 mt-6">
          {option.monthly_breakdown.map((mb, idx) => (
            <div key={idx} className="border border-gray-100 bg-gray-50 p-4 rounded-lg">
              <div className="font-semibold text-gray-800">{mb.month_name}</div>
              <div className="text-sm text-gray-600 mt-1"><span className="font-medium">Tema:</span> {mb.monthly_theme}</div>
              <div className="text-sm text-gray-600"><span className="font-medium">Goal:</span> {mb.key_goal}</div>

              {isSelected && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {!monthPosts[mb.month_name] ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleBreakdownMonth(mb.month_name, mb.monthly_theme, mb.key_goal); }}
                      disabled={loadingMonths[mb.month_name]}
                      className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center justify-center w-full disabled:opacity-50"
                    >
                      {loadingMonths[mb.month_name] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                      Breakdown Month
                    </button>
                  ) : (
                    <div>
                      <div className="bg-white p-3 rounded border border-gray-200 text-sm max-h-40 overflow-y-auto mb-3">
                        {monthPosts[mb.month_name].map((p, i) => (
                          <div key={i} className="mb-2 pb-2 border-b border-gray-100 last:border-0 last:pb-0">
                            <p className="font-medium">Post {i+1}</p>
                            <p className="text-gray-600 text-xs mt-1 line-clamp-2">{p.caption}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePushToSchedule(mb.month_name); }}
                        disabled={schedulingMonths[mb.month_name]}
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center w-full disabled:opacity-50"
                      >
                         {schedulingMonths[mb.month_name] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Push to Schedule
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaign Planner</h1>
        <p className="text-gray-500 mt-1">AI-powered 6-month marketing roadmap generator.</p>
      </div>

      {step === 1 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">Step 1: Campaign Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5" placeholder="e.g., Umrah Akbar Akhir Tahun" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
              <textarea value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 h-24" placeholder="e.g., Keluarga muda usia 30-45 tahun, karyawan swasta..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5" />
            </div>
            <button
              onClick={handleGenerateOptions}
              disabled={loadingOptions || !title || !targetAudience || !startDate}
              className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-lg hover:bg-emerald-700 transition flex justify-center items-center disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Strategy Options
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Generating AI Strategies...</h2>
          <p className="text-gray-500 mt-2 text-center max-w-md">Our AI is mapping the Hijri calendar and crafting 3 unique 6-month marketing roadmaps for you.</p>
        </div>
      )}

      {step === 3 && options && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Step 2: Select a Strategy</h2>
          {selectedOption && <p className="text-emerald-600 font-medium">Strategy {selectedOption} selected. You can now breakdown each month.</p>}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderOptionCard('A', options.option_a)}
            {renderOptionCard('B', options.option_b)}
            {renderOptionCard('C', options.option_c)}
          </div>
        </div>
      )}
    </div>
  );
};
