import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/firebaseService';
import { useUserProfile } from '../../hooks/useUserProfile';
import {
  Search,
  Filter,
  MoreVertical,
  Phone,
  X
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

type LeadStatus = 'NEW' | 'COLD' | 'WARM' | 'HOT' | 'WON';
type Platform = 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'WEB';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  platform: Platform;
  status: LeadStatus;
  lastContact: string;
  notes: string;
}

const STATUSES: LeadStatus[] = ['NEW', 'COLD', 'WARM', 'HOT'];


const PlatformBadge = ({ platform }: { platform: Platform }) => {
  switch (platform) {
    case 'WHATSAPP': return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-medium border border-green-200">WA</span>;
    case 'FACEBOOK': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-medium border border-blue-200">FB</span>;
    case 'INSTAGRAM': return <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded text-[10px] font-medium border border-pink-200">IG</span>;
    case 'TIKTOK': return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200">TK</span>;
    default: return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200">WEB</span>;
  }
};




export const LeadsList: React.FC = () => {
  const { profile } = useUserProfile();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<Platform | 'ALL'>('ALL');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modals for edit & delete
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    platform: 'WEB' as Platform,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = dbService.subscribeToCollection('leads', (data) => {
      const mappedLeads = data.map(doc => ({
        id: doc.id,
        name: doc.name || 'Unknown',
        phone: doc.phone || '',
        email: doc.email || '',
        platform: doc.source || 'WEB',
        status: doc.status || 'NEW',
        lastContact: doc.createdAt ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
        notes: doc.notes || ''
      })) as Lead[];

      setLeads(mappedLeads);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredLeads = leads.filter(lead => {
    // EXCLUDE 'WON' leads from the Kanban board
    if (lead.status === 'WON') return false;

    const matchesStatus = filter === 'ALL' || lead.status === filter;
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.phone.includes(searchTerm);
    const matchesSource = sourceFilter === 'ALL' || lead.platform === sourceFilter;

    return matchesStatus && matchesSearch && matchesSource;
  });

  // Calculate Stats
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;

  const leadsToday = leads.filter(l => l.lastContact !== 'N/A' && (now.getTime() - new Date(l.lastContact).getTime()) <= oneDay).length;
  const leadsThisWeek = leads.filter(l => l.lastContact !== 'N/A' && (now.getTime() - new Date(l.lastContact).getTime()) <= sevenDays).length;
  const wonLeadsCount = leads.filter(l => l.status === 'WON').length;
  const totalLeadsCount = leads.length;
  const conversionRate = totalLeadsCount > 0 ? Math.round((wonLeadsCount / totalLeadsCount) * 100) : 0;


  const getLeadsByStatus = (status: LeadStatus) => {
    return filteredLeads.filter(lead => lead.status === status);
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name || !newLead.phone) return;

    setIsSubmitting(true);
    try {
      await dbService.addDocument('leads', {
        name: newLead.name,
        phone: newLead.phone,
        email: newLead.email,
        source: newLead.platform,
        status: 'NEW',
        notes: newLead.notes,
        createdAt: new Date(),
        branchId: profile?.branchId || null,
        partnerId: profile?.partnerId || profile?.uid || null, // default partnerId to uid if mitra
        assignedTo: profile?.uid || null
      });
      setIsModalOpen(false);
      setNewLead({
        name: '',
        phone: '',
        email: '',
        platform: 'WEB',
        notes: ''
      });
    } catch (error) {
      console.error('Error adding new lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as LeadStatus;

    // Optimistic update
    const updatedLeads = leads.map(lead =>
      lead.id === draggableId ? { ...lead, status: newStatus } : lead
    );
    setLeads(updatedLeads);

    // Update in Firestore
    try {
      await dbService.updateDocument('leads', draggableId, { status: newStatus });
    } catch (error) {
      console.error('Error updating lead status:', error);
      // Revert optimistic update on error by triggering a refetch or ignoring
      // since the subscription will override anyway
    }
  };


  const handleDeleteLead = async () => {
    if (!leadToDelete) return;
    try {
      await dbService.deleteDocument('leads', leadToDelete);
      setIsDeleteModalOpen(false);
      setLeadToDelete(null);
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  const handleMarkAsWon = async (id: string) => {
    try {
      await dbService.updateDocument('leads', id, { status: 'WON' });
      setActiveMenuId(null);
    } catch (error) {
      console.error('Error marking as won:', error);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    try {
      await dbService.updateDocument('leads', editingLead.id, {
        name: editingLead.name,
        phone: editingLead.phone,
        notes: editingLead.notes
      });
      setIsEditModalOpen(false);
      setEditingLead(null);
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuId && !(event.target as Element).closest('.menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  if (loading) {

    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0 mb-2">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Leads Today</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{leadsToday}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Leads This Week</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{leadsThisWeek}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Conversion Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{conversionRate}%</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads Management</h1>
          <p className="text-gray-500 mt-1">Manage and track your potential Jamaah</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
        >
          <Phone className="w-4 h-4 mr-2" />
          Add New Lead
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center flex-shrink-0">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            className="border border-gray-200 rounded-lg text-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
          >
            <option value="ALL">All Sources</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="TIKTOK">TikTok</option>
            <option value="WEB">Web</option>
          </select>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            className="border border-gray-200 rounded-lg text-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="ALL">All Status</option>
            <option value="NEW">New</option>
            <option value="HOT">Hot</option>
            <option value="WARM">Warm</option>
            <option value="COLD">Cold</option>
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4 flex-grow items-start min-h-0">
          {STATUSES.map((status) => {
            const statusLeads = getLeadsByStatus(status);
            return (
              <div key={status} className="flex flex-col flex-shrink-0 w-80 bg-gray-50 rounded-xl max-h-full">
                {/* Column Header */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-100 rounded-t-xl sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-700">{status}</h3>
                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-medium text-gray-500 border border-gray-200">
                      {statusLeads.length}
                    </span>
                  </div>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={status}>
                  {(droppableProvided, droppableSnapshot) => (
                    <div
                      ref={droppableProvided.innerRef}
                      {...droppableProvided.droppableProps}
                      className={`flex-1 p-3 overflow-y-auto space-y-3 transition-colors ${
                        droppableSnapshot.isDraggingOver ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {statusLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(draggableProvided, draggableSnapshot) => (
                            <div
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              {...draggableProvided.dragHandleProps}
                              className={`bg-white p-4 rounded-lg shadow-sm border ${
                                draggableSnapshot.isDragging ? 'border-blue-400 shadow-md ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-blue-300'
                              } transition-all cursor-grab active:cursor-grabbing`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                                    {lead.name.charAt(0)}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900">{lead.name}</h4>
                                    <div className="flex items-center gap-1 mt-1">
                                      <PlatformBadge platform={lead.platform} />
                                      <span className="text-xs text-gray-500 truncate max-w-[120px] ml-1">{lead.notes || 'No notes'}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="relative menu-container">
                                  <button
                                    onClick={() => setActiveMenuId(activeMenuId === lead.id ? null : lead.id)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                  {activeMenuId === lead.id && (
                                    <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 z-50 py-1">
                                      <button
                                        onClick={() => { setEditingLead(lead); setIsEditModalOpen(true); setActiveMenuId(null); }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                      >
                                        Edit Details
                                      </button>
                                      <button
                                        onClick={() => handleMarkAsWon(lead.id)}
                                        className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                                      >
                                        Mark as Won
                                      </button>
                                      <button
                                        onClick={() => { setLeadToDelete(lead.id); setIsDeleteModalOpen(true); setActiveMenuId(null); }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                      >
                                        Delete Lead
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {lead.phone || 'No phone'}
                                </span>
                                <span>{lead.lastContact}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {droppableProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Add Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Add New Lead</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddLead} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+62 812 3456 7890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform source
                </label>
                <select
                  value={newLead.platform}
                  onChange={(e) => setNewLead({ ...newLead, platform: e.target.value as Platform })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="WEB">Web</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="FACEBOOK">Facebook</option>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="TIKTOK">TikTok</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
                  placeholder="Any additional notes about this lead..."
                ></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newLead.name || !newLead.phone}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {isEditModalOpen && editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Edit Lead</h2>
              <button
                onClick={() => { setIsEditModalOpen(false); setEditingLead(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editingLead.name}
                  onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={editingLead.phone}
                  onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editingLead.notes}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
                ></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingLead(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Lead?</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this lead? This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => { setIsDeleteModalOpen(false); setLeadToDelete(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 w-full"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLead}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors w-full"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};