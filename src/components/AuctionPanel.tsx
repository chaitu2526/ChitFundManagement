import React, { useState, useEffect } from 'react';
import { chitService } from '../services/chitService';
import { Member, Group, GroupMember, Auction } from '../types';
import { Hammer, TrendingDown, Users, Send } from 'lucide-react';

interface AuctionPanelProps {
  groups: Group[];
  members: Member[];
}

const WHATSAPP_NUMBER = '7207709633';

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

  const [activeBroadcastAuctionId, setActiveBroadcastAuctionId] = useState<string | null>(null);

  const sendWhatsAppNotification = (auction: Auction, targetMember?: Member, memberSlots?: number) => {
    if (!selectedGroup) return;
    
    const winner = members.find(m => m.id === auction.winnerMemberId);
    const baseInstallment = selectedGroup.totalChitValue / selectedGroup.totalSlots;
    const netPayablePerSlot = baseInstallment - auction.dividendPerSlot;
    
    const auctionDisplayDate = auction.auctionDate ? (auction.auctionDate instanceof Date ? auction.auctionDate : (auction.auctionDate as any).toDate()).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : `Month ${auction.monthNumber}`;

    let message = "";
    if (targetMember && memberSlots) {
      // Individual Member message
      const totalDue = netPayablePerSlot * memberSlots;
      message = `*CHIT PAYMENT REMINDER*%0A%0A` +
        `Hello *${targetMember.name}*,%0A%0A` +
        `The auction for *${selectedGroup.name}* (${auctionDisplayDate}) is completed.%0A%0A` +
        `*Group:* ${selectedGroup.name}%0A` +
        `*Period:* ${auctionDisplayDate}%0A` +
        `*Dividend/Slot:* ₹${auction.dividendPerSlot.toFixed(2)}%0A` +
        `*Your Slots:* ${memberSlots}%0A` +
        `*Total Amount Due:* ₹${totalDue.toLocaleString()}%0A%0A` +
        `Please clear the due at the earliest. Thank you!`;
      
      const phone = targetMember.phone?.replace(/\D/g, '') || WHATSAPP_NUMBER;
      window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
    } else {
      // Admin Summary message
      message = `*CHIT MANAGER - AUCTION COMPLETED*%0A%0A` +
        `*Group:* ${selectedGroup.name}%0A` +
        `*Period:* ${auctionDisplayDate}%0A` +
        `*Winner:* ${winner?.name || 'Unknown'}%0A` +
        `*Bid Amount:* ₹${auction.winningBid.toLocaleString()}%0A` +
        `*Dividend per Slot:* ₹${auction.dividendPerSlot.toFixed(2)}%0A` +
        `*Net Payable per Slot:* ₹${netPayablePerSlot.toLocaleString()}%0A%0A` +
        `_Generated via ChitManager System_`;
      
      window.open(`https://wa.me/91${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    }
  };

  const handleBroadcastAll = (auction: Auction) => {
    if (!selectedGroup) return;
    
    if (confirm(`This will attempt to open ${groupMemberships.length} WhatsApp windows. Please allow popups if prompted. Continue?`)) {
      groupMemberships.forEach((gm, index) => {
        const member = members.find(m => m.id === gm.memberId);
        if (member) {
          // Add a tiny delay between opens to help some browsers handle multiple windows/tabs better
          setTimeout(() => {
            sendWhatsAppNotification(auction, member, gm.slots);
          }, index * 800);
        }
      });
    }
  };

  const handleSubmitAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !winnerMemberId) return;

    const dividendPerSlot = winningBid / selectedGroup.totalSlots;

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
      // Auto-prompt to shared (Optional, but user asked for "automatically", so we prompt)
      if (confirm("Auction recorded. Would you like to send the notification to WhatsApp now?")) {
        sendWhatsAppNotification({ ...auctionData, id: 'temp' } as any);
      }
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
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Record settlements and broadcast dividends</p>
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
                      <span className="data-value text-emerald-400 font-bold">₹{(winningBid / selectedGroup.totalSlots).toFixed(0)}</span>
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
                  <p className="text-lg font-bold">₹{(selectedGroup.totalChitValue / selectedGroup.totalSlots).toLocaleString()}</p>
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
                  const isBroadcasting = activeBroadcastAuctionId === auction.id;
                  
                  return (
                    <div key={auction.id} className={`transition-all ${isBroadcasting ? 'scale-[1.02] z-10' : ''}`}>
                      <div className={`glass-panel border-white/5 overflow-hidden transition-all ${isBroadcasting ? 'border-blue-500/50 bg-blue-600/5 ring-1 ring-blue-500/20' : 'hover:border-white/10'}`}>
                        <div className="grid grid-cols-[0.7fr,1fr,1.3fr,1fr,0.8fr] data-row border-0 text-sm py-4 items-center">
                          <div className="data-value text-zinc-400 text-xs font-bold uppercase">
                            {auction.auctionDate ? (auction.auctionDate instanceof Date ? auction.auctionDate : (auction.auctionDate as any).toDate()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : `#${auction.monthNumber}`}
                          </div>
                          <div className="data-value font-bold text-white">₹{auction.winningBid.toLocaleString()}</div>
                          <div className="font-semibold truncate text-zinc-300">{winner?.name || 'Unknown'}</div>
                          <div className="data-value text-emerald-500 font-bold">+{auction.dividendPerSlot.toFixed(0)}</div>
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleEditAuction(auction)}
                              className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                              title="Edit Auction"
                            >
                              <Hammer size={14} />
                            </button>
                            <button 
                              onClick={() => setActiveBroadcastAuctionId(isBroadcasting ? null : auction.id)}
                              className={`transition-all flex items-center justify-center p-2 rounded-lg ${isBroadcasting ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-500 hover:bg-blue-600/10'}`}
                              title="Broadcast Notifications"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </div>

                        {isBroadcasting && (
                          <div className="bg-black/40 border-t border-white/5 p-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex justify-between items-center bg-blue-600/10 p-4 rounded-xl border border-blue-500/20">
                              <div className="space-y-1">
                                <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-blue-400">Mass Broadcast</h4>
                                <p className="text-[10px] text-zinc-500">Notify all {groupMemberships.length} members at once</p>
                              </div>
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => handleBroadcastAll(auction)}
                                  className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-green-500/20"
                                >
                                  <Send size={12} /> Broadcast All
                                </button>
                                <button onClick={() => setActiveBroadcastAuctionId(null)} className="text-[9px] uppercase font-black px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">Abort</button>
                              </div>
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                              {groupMemberships.map(gm => {
                                const member = members.find(m => m.id === gm.memberId);
                                const baseInstallment = selectedGroup.totalChitValue / selectedGroup.totalSlots;
                                const totalDue = (baseInstallment - auction.dividendPerSlot) * gm.slots;
                                
                                return (
                                  <div key={gm.id} className="flex justify-between items-center text-[12px] bg-white/[0.03] p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                                    <div className="space-y-0.5">
                                      <p className="font-bold text-zinc-200">{member?.name}</p>
                                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">{gm.slots} {gm.slots === 1 ? 'Slot' : 'Slots'}</p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                      <div className="text-right">
                                        <p className="text-[9px] uppercase tracking-tighter text-zinc-600 font-bold mb-0.5">Net Due</p>
                                        <p className="font-mono font-bold text-white tracking-tighter">₹{totalDue.toLocaleString()}</p>
                                      </div>
                                      <button 
                                        onClick={() => sendWhatsAppNotification(auction, member, gm.slots)}
                                        className="bg-[#25D366]/10 text-[#25D366] p-3 rounded-xl border border-[#25D366]/20 group-hover:bg-[#25D366] group-hover:text-white transition-all transform group-hover:scale-105"
                                        title="Send WhatsApp Alert"
                                      >
                                        <Send size={14} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
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
            <p className="max-w-[300px] text-sm text-zinc-500 font-medium">Please select an active chit group from the header to manage auctions and broadcast dividends.</p>
          </div>
        </div>
      )}
    </div>
  );
};
