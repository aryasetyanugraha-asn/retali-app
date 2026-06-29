import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/firebaseService';
import { useAuth } from '../../context/AuthContext';
import {
  Loader2,
  ChevronRight,
  ChevronDown,
  Calendar,
  Copy,
  Download,
  Edit2,
  Check,
  X,
  FileDown,
  Trash2
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PostIdea {
  caption: string;
  image_prompt: string;
}

interface Campaign {
  id: string;
  title: string;
  target_audience: string;
  start_date: any;
  selected_option: string;
  options: any;
  budget_plan: any;
  monthPosts?: Record<string, PostIdea[]>;
  status: string;
}

export const CampaignLibrary: React.FC = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<{ campaignId: string, month: string, index: number, caption: string } | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = dbService.subscribeToCollection(
      `users/${user.uid}/campaigns`,
      (data) => {
        setCampaigns(data as Campaign[]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleCopyCaption = (caption: string) => {
    navigator.clipboard.writeText(caption);
    alert('Caption copied to clipboard!');
  };

  const handleDownloadImagePrompt = (prompt: string, index: number) => {
    const blob = new Blob([prompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `image_prompt_post_${index + 1}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpdateCaption = async () => {
    if (!user || !editingPost) return;

    try {
      const campaign = campaigns.find(c => c.id === editingPost.campaignId);
      if (!campaign || !campaign.monthPosts) return;

      const updatedPosts = [...campaign.monthPosts[editingPost.month]];
      updatedPosts[editingPost.index] = {
        ...updatedPosts[editingPost.index],
        caption: editingPost.caption
      };

      await dbService.updateDocument(`users/${user.uid}/campaigns`, editingPost.campaignId, {
        [`monthPosts.${editingPost.month}`]: updatedPosts
      });

      setEditingPost(null);
    } catch (error) {
      console.error('Error updating caption:', error);
      alert('Failed to update caption.');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await dbService.deleteDocument(`users/${user.uid}/campaigns`, id);
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign.');
    }
  };

  const handleDownloadPDF = async (campaign: Campaign) => {
    const element = document.getElementById(`campaign-report-${campaign.id}`);
    if (!element) return;

    setDownloading(campaign.id);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Campaign_Report_${campaign.title.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report.');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaign Library</h1>
        <p className="text-gray-500 mt-1">Manage and view your saved marketing strategies.</p>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No campaigns yet</h3>
          <p className="text-gray-500 mt-1">Generate your first strategy in the Campaign Planner.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div
                className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(expandedId === campaign.id ? null : campaign.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{campaign.title}</h3>
                    <p className="text-sm text-gray-500">
                      Option {campaign.selected_option} • {new Date(campaign.start_date.toDate()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPDF(campaign);
                      }}
                      disabled={downloading === campaign.id}
                      className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                      title="Download PDF"
                    >
                      {downloading === campaign.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCampaign(campaign.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    {expandedId === campaign.id ? <ChevronDown className="w-6 h-6 text-gray-400" /> : <ChevronRight className="w-6 h-6 text-gray-400" />}
                  </div>
                </div>
              </div>

              {expandedId === campaign.id && (
                <div className="border-t border-gray-100 p-6 space-y-8" id={`campaign-report-${campaign.id}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 underline">Strategy Overview</h4>
                      <p className="text-sm text-gray-600"><span className="font-medium">Target Audience:</span> {campaign.target_audience}</p>
                      <p className="text-sm text-gray-600 mt-2"><span className="font-medium">Theme:</span> {campaign.options[`option_${campaign.selected_option.toLowerCase()}`].theme}</p>
                    </div>
                    {campaign.budget_plan && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h4 className="font-semibold text-blue-900 mb-2">Budget Allocation</h4>
                        <p className="text-sm text-blue-800">Monthly Spend: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(campaign.budget_plan.recommended_monthly_ad_spend)}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(campaign.budget_plan.budget_allocation || {}).map(([key, val]) => (
                            <span key={key} className="text-[10px] bg-white text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                              {key}: {String(val)}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <h4 className="font-semibold text-gray-900 underline">Monthly Breakdown</h4>
                    {campaign.options[`option_${campaign.selected_option.toLowerCase()}`].monthly_breakdown.map((mb: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h5 className="font-bold text-gray-800">{mb.month_name}</h5>
                            <p className="text-xs text-gray-500">{mb.monthly_theme} • {mb.key_goal}</p>
                          </div>
                        </div>

                        {campaign.monthPosts && campaign.monthPosts[mb.month_name] && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {campaign.monthPosts[mb.month_name].map((post, pIdx) => (
                              <div key={pIdx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative group">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Post {pIdx + 1}</span>
                                  <div className="flex space-x-1 data-html2canvas-ignore">
                                    <button
                                      onClick={() => setEditingPost({ campaignId: campaign.id, month: mb.month_name, index: pIdx, caption: post.caption })}
                                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleCopyCaption(post.caption)}
                                      className="p-1 hover:bg-gray-100 rounded text-blue-500"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDownloadImagePrompt(post.image_prompt, pIdx)}
                                      className="p-1 hover:bg-gray-100 rounded text-emerald-500"
                                    >
                                      <Download className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {editingPost?.campaignId === campaign.id && editingPost?.month === mb.month_name && editingPost?.index === pIdx ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editingPost.caption}
                                      onChange={(e) => setEditingPost({ ...editingPost, caption: e.target.value })}
                                      className="w-full text-xs border border-emerald-500 rounded p-2 h-24 focus:ring-1 focus:ring-emerald-500 outline-none"
                                    />
                                    <div className="flex justify-end space-x-1">
                                      <button onClick={() => setEditingPost(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                                      <button onClick={handleUpdateCaption} className="p-1 text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-600 italic line-clamp-4">"{post.caption}"</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
