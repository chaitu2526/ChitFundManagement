import React, { useState, useEffect } from 'react';
import { chitService } from '../services/chitService';
import { Member, Group, GroupMember, Auction } from '../types';
import { Hammer, TrendingDown, Users } from 'lucide-react';

interface AuctionPanelProps {
  groups: Group[];
  members: Member[];
}

export const AuctionPanel: React.FC<AuctionPanelProps> = ({ groups, members }) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [groupMemberships, setGroupMemberships] = useState<GroupMember[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  
  const [monthNumber, setMonthNumber] = useState(1);
  const [winningBid, setWinningBid] = useState(0);
  const [winnerMemberId, setWinnerMemberId] = useState('');
  const [auctionMonth, setAuctionMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [editingAuctionId, setEditingAuctionId] = useState<string | null>(null);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  useEffect(() => {
    if (selectedGroupId) {
      const unsubMembers = chitService.getGroupMembers(selectedGroupId, setGroupMemberships);
      const unsubAuctions = chitService.getAuctions(selectedGroupId, setAuctions);
      return () => {
        unsubMembers();
        unsubAuctions();
      };
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (!editingAuctionId) {
      if (auctions.length > 0) {
        const maxMonth = auctions.reduce((max, a) => Math.max(max, a.monthNumber), 0);
        setMonthNumber(maxMonth + 1);
      } else {
        setMonthNumber(1);
      }
    }
  }, [auctions, editingAuctionId]);

  const handleSubmitAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !winnerMemberId) return;

    const dividendPerSlot = Math.round(winningBid / selectedGroup.totalSlots);

    const auctionData = {
      groupId: selectedGroupId,
      monthNumber,
      winningBid,
      winnerMemberId,
      dividendPerSlot,
      auctionDate: new Date(auctionMonth + '-01') as any // Default to 1st of month
    };

    if (editingAuctionId) {
      await chitService.updateAuction(editingAuctionId, auctionData);
      setEditingAuctionId(null);
    } else {
      await chitService.addAuction(auctionData);
    }

    setMonthNumber(editingAuctionId ? monthNumber : (prev => prev + 1));
    setWinningBid(0);
    setWinnerMemberId('');
  };

  const handleEditAuction = (auction: Auction) => {
    setEditingAuctionId(auction.id);
    setMonthNumber(auction.monthNumber);
    setWinningBid(auction.winningBid);
    setWinnerMemberId(auction.winnerMemberId);
    if (auction.auctionDate) {
      const date = auction.auctionDate instanceof Date ? auction.auctionDate : (auction.auctionDate as any).toDate();
      setAuctionMonth(date.toISOString().slice(0, 7));
    }
  };

  const cancelEdit = () => {
    setEditingAuctionId(null);
    setMonthNumber(auctions.length + 1);
    setWinningBid(0);
    setWinnerMemberId('');
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-blue-600/10 border border-blue-500/20 p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10 space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Hammer size={24} />
            </div>
            <span>Auction Management</span>
          </h2>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Record settlements and history</p>
        </div>
        
        <div className="relative z-10 w-full md:w-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">Select Active Chit</p>
          <select 
            className="w-full md:min-w-[250px] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold tracking-wide outline-none focus:border-blue-500/50 transition-all appearance-none"
            value={selectedGroupId}
            onChange={e => setSelectedGroupId(e.target.value)}
          >
            <option value="" className="bg-[#0a0b10]">-- Select Active Chit --</option>
            {groups.map(g => <option key={g.id} value={g.id} className="bg-[#0a0b10]">{g.name}</option>)}
          </select>
        </div>
      </header>

      {selectedGroup ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="glass-panel p-8 shadow-xl shadow-blue-900/5">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <TrendingDown size={18} className="text-blue-500" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                    {editingAuctionId ? 'Modify Settlement' : 'Record Settlement'}
                  </h3>
                </div>
                {editingAuctionId && (
                  <button 
                    onClick={cancelEdit}
                    className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSubmitAuction} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="col-header">Month Cycle</label>
                    <input type="number" value={monthNumber} onChange={e => setMonthNumber(Number(e.target.value))} className="input-technical" required />
                  </div>
                  <div className="space-y-2">
                    <label className="col-header">Session Month</label>
                    <input type="month" value={auctionMonth} onChange={e => setAuctionMonth(e.target.value)} className="input-technical" required />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="col-header">Winning Stakeholder</label>
                  <select 
                    className="input-technical" 
                    value={winnerMemberId} 
                    onChange={e => setWinnerMemberId(e.target.value)}
                    required
                  >
                    <option value="" className="bg-[#161b22]">-- Select Member --</option>
                    {groupMemberships.map(gm => {
                      const m = members.find(m => m.id === gm.memberId);
                      return <option key={gm.id} value={gm.memberId} className="bg-[#161b22]">{m?.name} ({gm.slots} slots)</option>;
                    })}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="col-header">Winning Bid (Loss Amount)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">₹</span>
                    <input 
                      type="number" 
                      value={winningBid} 
                      onChange={e => setWinningBid(Number(e.target.value))} 
                      className="input-technical pl-8 text-lg font-bold" 
                      placeholder="0.00"
                      required 
                    />
                  </div>
                  <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Dividend per Slot</span>
                      <span className="data-value text-emerald-400 font-bold">₹{Math.round(winningBid / selectedGroup.totalSlots)}</span>
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn-technical w-full py-4 text-sm shadow-lg shadow-blue-500/10">
                  {editingAuctionId ? 'Update Auction Results' : 'Seal Auction Results'}
                </button>
              </form>
            </div>

            <div className="glass-panel p-6 border-white/5 bg-transparent">
              <h3 className="col-header mb-6">Chit Parameters</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="col-header text-[9px]">Value</p>
                  <p className="text-lg font-bold">₹{selectedGroup.totalChitValue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="col-header text-[9px]">Base Pay</p>
                  <p className="text-lg font-bold">₹{Math.round(selectedGroup.totalChitValue / selectedGroup.totalSlots).toLocaleString()}</p>
                </div>
                <div>
                  <p className="col-header text-[9px]">Cycles</p>
                  <p className="text-lg font-bold">{selectedGroup.totalMonths}</p>
                </div>
                <div>
                  <p className="col-header text-[9px]">Capacity</p>
                  <p className="text-lg font-bold">{selectedGroup.totalSlots} Slots</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <TrendingDown size={14} /> Settlement Log
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-[0.7fr,1fr,1.3fr,1fr,0.8fr] px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                <div>Period</div>
                <div>Bid</div>
                <div>Winner</div>
                <div>Div</div>
                <div className="text-right">Actions</div>
              </div>
              <div className="space-y-1">
                {auctions.sort((a,b) => b.monthNumber - a.monthNumber).map(auction => {
                  const winner = members.find(m => m.id === auction.winnerMemberId);
                  
                  return (
                    <div key={auction.id}>
                      <div className="glass-panel border-white/5 overflow-hidden transition-all hover:border-white/10">
                        <div className="grid grid-cols-[0.7fr,1fr,1.3fr,1fr,0.8fr] data-row border-0 text-sm py-4 items-center">
                          <div className="data-value text-zinc-400 text-xs font-bold uppercase">
                            {auction.auctionDate ? (auction.auctionDate instanceof Date ? auction.auctionDate : (auction.auctionDate as any).toDate()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : `#${auction.monthNumber}`}
                          </div>
                          <div className="data-value font-bold text-white">₹{Math.round(auction.winningBid).toLocaleString()}</div>
                          <div className="font-semibold truncate text-zinc-300">{winner?.name || 'Unknown'}</div>
                          <div className="data-value text-emerald-500 font-bold">+{Math.round(auction.dividendPerSlot).toLocaleString()}</div>
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleEditAuction(auction)}
                              className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                              title="Edit Auction"
                            >
                              <Hammer size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {auctions.length === 0 && (
                  <div className="glass-panel p-12 text-center text-zinc-600 flex flex-col items-center gap-4 border-dashed">
                    <TrendingDown size={32} className="opacity-10" />
                    <p className="text-[10px] uppercase font-black tracking-[0.3em]">No Settlements Recorded</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-96 glass-panel border-dashed p-12 flex flex-col items-center justify-center gap-6 text-zinc-600 text-center animate-in fade-in duration-700">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/5 border-dashed">
            <Hammer size={32} className="opacity-20" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-zinc-300">Awaiting Chit Selection</h3>
            <p className="max-w-[300px] text-sm text-zinc-500 font-medium">Please select an active chit group from the header to manage auctions.</p>
          </div>
        </div>
      )}
    </div>
  );
};
