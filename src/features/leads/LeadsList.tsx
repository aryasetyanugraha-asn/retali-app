import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/firebaseService';
import {
  Search,
  Filter,
  MoreVertical,
  Phone,
  Mail,
  Facebook,
  Instagram,
  MessageCircle,
  Video
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

type LeadStatus = 'NEW' | 'COLD' | 'WARM' | 'HOT';
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

const PlatformIcon = ({ platform }: { platform: Platform }) => {
  switch (platform) {
    case 'WHATSAPP': return <MessageCircle className="w-4 h-4 text-green-600" />;
    case 'FACEBOOK': return <Facebook className="w-4 h-4 text-blue-600" />;
    case 'INSTAGRAM': return <Instagram className="w-4 h-4 text-pink-600" />;
    case 'TIKTOK': return <Video className="w-4 h-4 text-black" />; // Lucide doesn't have TikTok, using Video
    default: return <Mail className="w-4 h-4 text-gray-600" />;
  }
};

export const LeadsList: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

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
    const matchesStatus = filter === 'ALL' || lead.status === filter;
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.phone.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const getLeadsByStatus = (status: LeadStatus) => {
    return filteredLeads.filter(lead => lead.status === status);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads Management</h1>
          <p className="text-gray-500 mt-1">Manage and track your potential Jamaah</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center">
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
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <div className="p-1 rounded-full bg-gray-50">
                                        <PlatformIcon platform={lead.platform} />
                                      </div>
                                      <span className="text-xs text-gray-500 truncate max-w-[120px]">{lead.notes || 'No notes'}</span>
                                    </div>
                                  </div>
                                </div>
                                <button className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
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
    </div>
  );
};
