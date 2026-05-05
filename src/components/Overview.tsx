import React, { useState, useEffect } from 'react';
import { Member, Group, Auction, GroupMember } from '../types';
import { BarChart3, TrendingUp, Users, ShieldCheck, ArrowLeft, Calendar } from 'lucide-react';
import { chitService } from '../services/chitService';

interface OverviewProps {
  groups: Group[];
  members: Member[];
}

export const Overview: React.FC<OverviewProps> = ({ groups, members }) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupMemberships, setGroupMemberships] = useState<GroupMember[]>([]);
  const [groupAuctions, setGroupAuctions] = useState<Auction[]>([]);

  const activeGroups = groups.filter(g => g.status === 'active');
  const totalValue = groups.reduce((acc, g) => acc + g.totalChitValue, 0);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  useEffect(() => {
    if (selectedGroupId) {
      const unsubMembers = chitService.getGroupMembers(selectedGroupId, setGroupMemberships);
      const unsubAuctions = chitService.getAuctions(selectedGroupId, setGroupAuctions);
      return () => {
        unsubMembers();
        unsubAuctions();
      };
    }
  }, [selectedGroupId]);

  if (selectedGroup) {
    // Group Detail View
    const baseInstallment = selectedGroup.totalChitValue / selectedGroup.totalSlots;
    const sortedAuctions = groupAuctions.slice().sort((a, b) => a.monthNumber - b.monthNumber);
    const monthsArray = Array.from({ length: selectedGroup.totalMonths }, (_, i) => i + 1);

    return (
      <div className="space-y-8 pb-20">
        <button 
          onClick={() => setSelectedGroupId(null)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-white/5 text-white/50 px-5 py-3 rounded-xl hover:bg-white/10 hover:text-white transition-all border border-white/5 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Dashboard</span>
        </button>

        <div className="glass-panel p-8 shadow-2xl shadow-blue-500/5">
          <div className="flex flex-col md:flex-row justify-between items-start border-b border-white/10 pb-8 mb-8 gap-6">
            <div className="space-y-2">
              <h2 className="text-4xl font-bold tracking-tight text-white">{selectedGroup.name}</h2>
              <p className="col-header">Group Financial Matrix & Installment Timeline</p>
            </div>
            <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl text-right min-w-[200px]">
              <p className="col-header mb-1">Target Value</p>
              <p className="data-value text-2xl text-blue-400">₹{selectedGroup.totalChitValue.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-1">
              <p className="col-header flex items-center gap-2">
                <Calendar size={12} /> Start Date
              </p>
              <p className="text-lg font-medium">{selectedGroup.startDate.toDate().toLocaleDateString()}</p>
            </div>
            <div className="space-y-1">
              <p className="col-header">Duration</p>
              <p className="text-lg font-medium">{selectedGroup.totalMonths} Months</p>
            </div>
            <div className="space-y-1">
              <p className="col-header">Base Payment</p>
              <p className="text-lg font-medium">₹{baseInstallment.toLocaleString()} / Slot</p>
            </div>
            <div className="space-y-1">
              <p className="col-header">Participation</p>
              <p className="text-lg font-medium">{groupMemberships.length} Enrolled</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
            <table className="w-full min-w-[1000px] border-collapse text-left">
              <thead>
                <tr className="bg-white/5">
                  <th className="p-5 col-header sticky left-0 bg-[#161b22] z-10 border-b border-white/5 w-48">Member Entity</th>
                  <th className="p-5 col-header border-b border-white/5 w-24 text-center">Slots</th>
                  {monthsArray.map(mo => (
                    <th key={mo} className="p-5 col-header border-b border-white/5 text-center text-[10px]">
                      MO-{mo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {groupMemberships.map(gm => {
                  const member = members.find(m => m.id === gm.memberId);
                  return (
                    <tr key={gm.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="p-5 font-semibold sticky left-0 bg-[#0d1117] z-10 text-zinc-300 border-r border-white/5">
                        {member?.name}
                      </td>
                      <td className="p-5 data-value text-center text-zinc-400 group-hover:text-blue-400 transition-colors">{gm.slots}</td>
                      {monthsArray.map(mo => {
                        const auction = sortedAuctions.find(a => a.monthNumber === mo);
                        const isWinner = auction?.winnerMemberId === gm.memberId;
                        
                        // Calculate due
                        const dividend = auction?.dividendPerSlot || 0;
                        const duePerSlot = auction ? (baseInstallment - dividend) : baseInstallment;
                        const totalDue = duePerSlot * gm.slots;

                        return (
                          <td key={mo} className={`p-5 text-center transition-all ${isWinner ? 'bg-blue-600/10 relative overflow-hidden' : ''}`}>
                            {isWinner && <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/20 rotate-45 translate-x-4 -translate-y-4"></div>}
                            <div className={`data-value text-xs font-bold ${isWinner ? 'text-blue-400' : 'text-zinc-500'}`}>
                              {totalDue.toLocaleString()}
                            </div>
                            {isWinner && <div className="text-[8px] uppercase tracking-tighter text-blue-500 font-black mt-1">Winner</div>}
                            {!auction && <div className="text-[8px] uppercase tracking-tighter opacity-20 italic mt-1 font-bold">Planned</div>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-8 p-5 bg-blue-900/10 rounded-xl flex items-start gap-4 border border-blue-500/10">
            <ShieldCheck size={20} className="text-blue-500 shrink-0" />
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400">Calculation Protocol</p>
              <p className="text-[11px] leading-relaxed text-zinc-500 font-medium">
                Monthly due is calculated as (Base Installment - Dividend). 
                The Dividend for Month N is derived from the auction results for that specific period.
                Historical months show finalized dues, while future months reflect the base installment until auctions conclude.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <BarChart3 className="text-blue-500" />
          <span>System Overview</span>
        </h1>
        <p className="text-zinc-500 text-sm">Real-time portfolio metrics and active group monitoring.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 shadow-xl shadow-blue-950/20 group hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <Users size={20} />
            </div>
            <Users size={16} className="opacity-10 group-hover:opacity-20 transition-all" />
          </div>
          <p className="col-header mb-1">Protocol Members</p>
          <p className="data-value text-4xl font-bold text-white tracking-tight">{members.length}</p>
        </div>

        <div className="glass-panel p-6 shadow-xl shadow-blue-950/20 group hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
              <BarChart3 size={20} />
            </div>
            <BarChart3 size={16} className="opacity-10 group-hover:opacity-20 transition-all" />
          </div>
          <p className="col-header mb-1">Active Clusters</p>
          <p className="data-value text-4xl font-bold text-white tracking-tight">{activeGroups.length}</p>
        </div>

        <div className="glass-panel p-6 shadow-xl shadow-blue-950/20 group hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <ShieldCheck size={20} />
            </div>
            <ShieldCheck size={16} className="opacity-10 group-hover:opacity-20 transition-all" />
          </div>
          <p className="col-header mb-1">Total Assets (INR)</p>
          <p className="data-value text-4xl font-bold text-white tracking-tight">{(totalValue / 100000).toFixed(1)}<span className="text-xl ml-1 text-emerald-500">L</span></p>
        </div>

        <div className="glass-panel p-6 bg-blue-600/10 border-blue-500/20 shadow-xl shadow-blue-600/5 group hover:bg-blue-600/20 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="p-2 bg-blue-500 rounded-lg text-white">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="col-header text-blue-400/60 mb-1">Security Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <p className="data-value text-lg text-blue-400 font-bold uppercase tracking-widest">Active & Secure</p>
          </div>
        </div>
      </div>

      <section className="space-y-8">
        <div className="flex items-bottom justify-between gap-4 border-b border-white/5 pb-4">
          <h2 className="text-xl font-bold tracking-widest uppercase text-white/50">Active Group Clusters</h2>
          <div className="h-px bg-white/5 flex-1 mb-2"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeGroups.map(group => (
            <div 
              key={group.id} 
              onClick={() => setSelectedGroupId(group.id)}
              className="glass-panel p-8 hover:bg-white/[0.03] transition-all cursor-pointer group space-y-6 relative overflow-hidden active:scale-[0.98]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 group-hover:bg-blue-600/10 transition-all"></div>
              
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-white tracking-tight">{group.name}</h3>
                  <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                    <span className="flex items-center gap-1"><Users size={12} /> {group.totalSlots} Slots</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> {group.totalMonths} MO</span>
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:border-blue-500/30 group-hover:text-blue-400 transition-all">
                  <ArrowLeft size={18} className="rotate-180" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 relative z-10">
                <div>
                  <p className="col-header mb-1">Portfolio Value</p>
                  <p className="data-value text-xl font-bold text-white">₹{group.totalChitValue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="col-header mb-1">Installment / Slot</p>
                  <p className="data-value text-xl font-bold text-blue-400">₹{(group.totalChitValue / group.totalSlots).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
