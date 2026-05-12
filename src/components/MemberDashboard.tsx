import React, { useState, useEffect } from 'react';
import { chitService } from '../services/chitService';
import { Member, Group, GroupMember, Auction } from '../types';
import { Wallet, Calendar, AlertCircle } from 'lucide-react';

interface MemberDashboardProps {
  members: Member[];
  groups: Group[];
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ members, groups }) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [memberships, setMemberships] = useState<GroupMember[]>([]);
  const [allAuctions, setAllAuctions] = useState<Record<string, Auction[]>>({});

  useEffect(() => {
    if (selectedMemberId) {
      const unsub = chitService.getMembershipsForMember(selectedMemberId, (mships) => {
        setMemberships(mships);
        // For each group the member is in, fetch auctions to calculate dues
        mships.forEach(mship => {
          chitService.getAuctions(mship.groupId, (auctions) => {
            setAllAuctions(prev => ({ ...prev, [mship.groupId]: auctions }));
            
            // Set initial selected month to the latest month across all groups
            if (!selectedMonth) {
              const maxMonth = auctions.reduce((max, a) => Math.max(max, a.monthNumber), 0);
              setSelectedMonth(maxMonth || 1);
            }
          });
        });
      });
      return () => unsub();
    }
  }, [selectedMemberId]);

  const selectedMember = members.find(m => m.id === selectedMemberId);

  // Helper to get available months for the selector
  const availableMonths = Array.from({ length: 60 }, (_, i) => i + 1); // Up to 60 months span

  const calculateDueForGroup = (group: Group, mship: GroupMember, targetMonth: number) => {
    const auctions = allAuctions[group.id] || [];
    // Find the auction for the target month
    const targetAuction = auctions.find(a => a.monthNumber === targetMonth);
    
    // If it's a future month relative to recorded auctions, we use base installment (or last dividend?)
    // User wants to "check the dues for the previous months", so we prioritize finding that month's auction.
    const dividend = targetAuction?.dividendPerSlot || 0;
    const baseInstallment = group.totalChitValue / group.totalSlots;
    const duePerSlot = baseInstallment - dividend;
    return duePerSlot * mship.slots;
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-blue-600/10 border border-blue-500/20 p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10 space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Wallet size={24} />
            </div>
            <span>Financier Dashboard</span>
          </h2>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Track installments and historical dividends</p>
        </div>
        
        <div className="relative z-10 w-full md:w-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">Identify Stakeholder</p>
          <select 
            className="w-full md:min-w-[250px] bg-[#161b22] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold tracking-wide text-white outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
            value={selectedMemberId}
            onChange={e => setSelectedMemberId(e.target.value)}
          >
            <option value="" className="bg-[#161b22] text-zinc-400">-- Choose Member Entity --</option>
            {members.map(m => (
              <option key={m.id} value={m.id} className="bg-[#161b22] text-white">
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {selectedMember ? (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Aggregate Total Banner */}
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 glass-panel p-10 flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl shadow-blue-500/10 border-blue-500/20 bg-blue-500/[0.03]">
              <div className="text-center md:text-left space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Consolidated Net Due</h3>
                  <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black text-blue-400">
                    MONTH {selectedMonth}
                  </div>
                </div>
                <div className="flex items-baseline gap-2 justify-center md:justify-start">
                  <span className="text-xl font-bold text-zinc-500">₹</span>
                  <p className="text-6xl font-black text-white tracking-tighter">
                    {memberships.reduce((acc, mship) => {
                      const group = groups.find(g => g.id === mship.groupId);
                      if (!group || !selectedMonth) return acc;
                      return acc + calculateDueForGroup(group, mship, selectedMonth);
                    }, 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-center md:text-right p-6 bg-white/5 rounded-2xl border border-white/10 min-w-[180px]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Holding Units</p>
                <p className="text-3xl font-bold text-blue-400">{memberships.reduce((acc, m) => acc + m.slots, 0)} <span className="text-sm text-zinc-600">SLOTS</span></p>
              </div>
            </div>

            <div className="lg:w-1/3 glass-panel p-10 flex flex-col justify-center gap-6">
              <div className="space-y-1">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Temporal Filter</h4>
                <p className="text-sm font-bold text-white tracking-tight">Select Installment Period</p>
              </div>
              <div className="relative">
                <select 
                  className="w-full bg-[#161b22] border border-white/10 rounded-xl px-4 py-4 text-sm font-bold tracking-wide text-white outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                  value={selectedMonth || ''}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m} className="bg-[#161b22]">Period Month {m}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                  <Calendar size={16} />
                </div>
              </div>
              <p className="text-[10px] text-zinc-600 font-medium">Viewing financial dues and dividends specifically for the selected month cycle.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {memberships.map(mship => {
              const group = groups.find(g => g.id === mship.groupId);
              if (!group || !selectedMonth) return null;
              
              const auctions = allAuctions[group.id] || [];
              const targetAuction = auctions.find(a => a.monthNumber === selectedMonth);
              
              const baseInstallment = group.totalChitValue / group.totalSlots;
              const currentDividend = targetAuction?.dividendPerSlot || 0;
              const totalDue = calculateDueForGroup(group, mship, selectedMonth);

              return (
                <div key={mship.id} className="glass-panel p-8 relative overflow-hidden group hover:border-blue-500/30 hover:bg-blue-600/[0.02] transition-all hover:shadow-2xl hover:shadow-blue-500/5 active:scale-[0.99]">
                  <div className="absolute top-0 right-0 px-4 py-2 bg-blue-600/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-bl-xl border-l border-b border-blue-500/20">
                    {mship.slots} {mship.slots > 1 ? 'UNITS' : 'UNIT'}
                  </div>
                  
                  <div className="space-y-1 mb-8">
                    <h3 className="text-xl font-bold text-white tracking-tight pr-16">{group.name}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Asset Chit Info</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Base Installment</span>
                      <span className="text-sm font-semibold text-zinc-300">₹{(baseInstallment * mship.slots).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Period Dividend</span>
                      <span className="text-sm font-bold text-emerald-500">
                        {targetAuction ? `- ₹${(currentDividend * mship.slots).toLocaleString()}` : 'Awaiting Auction'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Net Due</span>
                        <p className="text-[9px] text-zinc-600 font-bold uppercase">Cycle {selectedMonth} of {group.totalMonths}</p>
                      </div>
                      <span className="text-2xl font-black text-white tracking-tighter">₹{totalDue.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      <Calendar size={12} className="text-blue-500" />
                      <span>{group.startDate.toDate().toLocaleDateString('en-IN', { month: 'short', year: 'numeric', day: 'numeric' })}</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                  </div>
                </div>
              )
            })}
          </div>

          {memberships.length === 0 && (
            <div className="glass-panel p-20 text-center flex flex-col items-center gap-6 border-dashed border-white/10 opacity-60">
              <div className="p-4 bg-white/5 rounded-full">
                <AlertCircle size={32} className="text-zinc-600" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-zinc-300">No Active Enrollments</p>
                <p className="text-xs text-zinc-600 uppercase font-black tracking-widest">This identity is not registered in any financial chits.</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-96 glass-panel border-dashed p-12 flex flex-col items-center justify-center gap-6 text-zinc-600 text-center animate-in fade-in duration-700">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/5 border-dashed">
            <Wallet size={32} className="opacity-20" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-zinc-300">Identity Verification Required</h3>
            <p className="max-w-[300px] text-sm text-zinc-500 font-medium">Please select a registered stakeholder from the selection matrix above to view consolidated financial data.</p>
          </div>
        </div>
      )}
    </div>
  );
};
