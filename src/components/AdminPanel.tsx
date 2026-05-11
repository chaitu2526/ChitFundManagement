import React, { useState, useEffect, useRef } from 'react';
import { chitService } from '../services/chitService';
import { Member, Group, GroupMember, AuthorizedUser, UserRole } from '../types';
import { Plus, Users, LayoutDashboard, UserPlus, Info, Trash2, Edit2, Check, X as CloseIcon, FileUp, ShieldCheck, MailPlus } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';

interface AdminPanelProps {
  members: Member[];
  groups: Group[];
  isSuperUser: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ members, groups, isSuperUser }) => {
  const [activeTab, setActiveTab] = useState<'members' | 'groups' | 'assignments' | 'access'>('groups');
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [allMemberships, setAllMemberships] = useState<GroupMember[]>([]);
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Access Control State
  const [newAuthEmail, setNewAuthEmail] = useState('');
  const [newAuthRole, setNewAuthRole] = useState<UserRole>(UserRole.DISPLAY);

  // Member Editing State
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Member Form State
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('');

  // Group Form State
  const [groupName, setGroupName] = useState('');
  const [totalValue, setTotalValue] = useState(100000);
  const [months, setMonths] = useState(20);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Group Editing State
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editTotalValue, setEditTotalValue] = useState(0);
  const [editMonths, setEditMonths] = useState(0);
  const [editStartDate, setEditStartDate] = useState('');

  // Group Assignment State
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [slots, setSlots] = useState(1);

  useEffect(() => {
    const unsubMemberships = chitService.getAllMemberships(setAllMemberships);
    
    let unsubAccess: (() => void) | null = null;
    if (isSuperUser) {
      unsubAccess = chitService.getAuthorizedUsers(setAuthorizedUsers);
    }

    return () => {
      unsubMemberships();
      if (unsubAccess) unsubAccess();
    };
  }, [isSuperUser]);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    await chitService.addMember({ name: memberName, email: memberEmail, phone: memberPhone });
    setMemberName('');
    setMemberEmail('');
    setMemberPhone('');
    setShowMemberForm(false);
  };

  const startEditMember = (member: Member) => {
    setEditingMemberId(member.id);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditPhone(member.phone || '');
  };

  const handleUpdateMember = async (id: string) => {
    await chitService.updateMember(id, {
      name: editName,
      email: editEmail,
      phone: editPhone
    });
    setEditingMemberId(null);
  };

  const handleDeleteMember = async (id: string) => {
    const hasEnrollments = allMemberships.some(m => m.memberId === id);
    if (hasEnrollments) {
      alert("Cannot delete member. This member is currently enrolled in one or more chit groups. Please remove all enrollments first.");
      return;
    }

    if (confirm("Are you sure you want to delete this member? This action cannot be undone.")) {
      await chitService.deleteMember(id);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const membersToAdd = data.map(item => ({
          name: item.Name || item.name || '',
          email: item.Email || item.email || '',
          phone: String(item.Phone || item.phone || '')
        })).filter(m => m.name && m.email);

        if (membersToAdd.length > 0) {
          await chitService.bulkAddMembers(membersToAdd);
          alert(`Successfully uploaded ${membersToAdd.length} members`);
        } else {
          alert("No valid member data found in the Excel sheet. Ensure columns are Name, Email, and Phone.");
        }
      } catch (error) {
        console.error("Error parsing Excel:", error);
        alert("Failed to parse Excel file. Please ensure it's a valid XLSX/CSV file.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    await chitService.addGroup({
      name: groupName,
      totalChitValue: totalValue,
      totalMonths: months,
      totalSlots: months, // Default 1 slot per month
      startDate: Timestamp.fromDate(new Date(startDate))
    });
    setGroupName('');
    setShowGroupForm(false);
  };

  const startEditGroup = (group: Group) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditTotalValue(group.totalChitValue);
    setEditMonths(group.totalMonths);
    setEditStartDate(group.startDate.toDate().toISOString().split('T')[0]);
  };

  const handleUpdateGroup = async (id: string) => {
    await chitService.updateGroup(id, {
      name: editGroupName,
      totalChitValue: editTotalValue,
      totalMonths: editMonths,
      totalSlots: editMonths, // Keep it simplified: 1 slot/month
      startDate: Timestamp.fromDate(new Date(editStartDate))
    });
    setEditingGroupId(null);
  };

  const handleDeleteGroup = async (id: string) => {
    const hasEnrollments = allMemberships.some(m => m.groupId === id);
    if (hasEnrollments) {
      alert("Cannot delete chit. This group currently has enrolled members. Please remove all enrollments first.");
      return;
    }

    if (confirm("Are you sure you want to delete this financial chit? All historical auction data (if any) will persist in logs but the group will be removed from circulation.")) {
      await chitService.deleteGroup(id);
    }
  };

  const handleAssignMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !selectedMember) return;
    await chitService.addGroupMember({
      groupId: selectedGroup,
      memberId: selectedMember,
      slots: slots
    });
    setSlots(1);
    setSelectedMember('');
    alert("Member assigned successfully");
  };

  const handleDeleteAssignment = async (id: string) => {
    console.log("Attempting to delete assignment:", id);
    if (window.confirm("Are you sure you want to remove this member from the group?")) {
      try {
        await chitService.removeGroupMember(id);
        console.log("Assignment deleted successfully");
      } catch (error) {
        console.error("Failed to delete assignment:", error);
        alert("Failed to remove enrollment. Check console for details.");
      }
    }
  };

  const handleAddAuthorizedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthEmail) return;
    
    // Check if already exists
    if (authorizedUsers.some(u => u.email === newAuthEmail.toLowerCase().trim())) {
      alert("This email is already whitelisted.");
      return;
    }

    await chitService.addAuthorizedUser(newAuthEmail, newAuthRole);
    setNewAuthEmail('');
  };

  const handleRemoveAuthorizedUser = async (id: string) => {
    if (confirm("Are you sure you want to revoke system connectivity for this user? They will lose access immediately.")) {
      await chitService.removeAuthorizedUser(id);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex gap-4 p-1.5 bg-white/5 rounded-2xl w-fit border border-white/5">
        <button 
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'groups' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <LayoutDashboard size={16} /> <span className="tracking-widest uppercase">Groups</span>
        </button>
        <button 
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'members' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Users size={16} /> <span className="tracking-widest uppercase">Members</span>
        </button>
        <button 
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'assignments' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <UserPlus size={16} /> <span className="tracking-widest uppercase">Enrollment</span>
        </button>
        {isSuperUser && (
          <button 
            onClick={() => setActiveTab('access')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'access' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <ShieldCheck size={16} /> <span className="tracking-widest uppercase">System Access</span>
          </button>
        )}
      </div>

      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/5">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">Member Registry</h2>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Manage system stakeholders</p>
            </div>
            <div className="flex gap-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-xl text-xs font-bold text-zinc-400 hover:bg-white/5 transition-all"
                disabled={isUploading}
              >
                <FileUp size={16} /> {isUploading ? 'Applying Data...' : 'Import Excel'}
              </button>
              <button 
                onClick={() => setShowMemberForm(!showMemberForm)} 
                className="btn-technical flex items-center gap-2"
              >
                {showMemberForm ? (
                  <><CloseIcon size={16} /> Cancel</>
                ) : (
                  <><Plus size={16} /> New Member</>
                )}
              </button>
            </div>
          </div>

          {showMemberForm && (
            <div className="glass-panel p-8 max-w-xl animate-in zoom-in-95 duration-200">
              <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-6">Create New Profile</h3>
              <form onSubmit={handleCreateMember} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <label className="col-header">Legal Name</label>
                    <input value={memberName} onChange={e => setMemberName(e.target.value)} className="input-technical" placeholder="Full name" required />
                  </div>
                  <div className="space-y-2">
                    <label className="col-header">Email Address</label>
                    <input type="email" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} className="input-technical" placeholder="Email contact" required />
                  </div>
                  <div className="space-y-2">
                    <label className="col-header">Phone Connectivity</label>
                    <input value={memberPhone} onChange={e => setMemberPhone(e.target.value)} className="input-technical" placeholder="Primary phone" />
                  </div>
                </div>
                <button type="submit" className="btn-technical w-full mt-4 py-4 text-sm">Deploy Member Profile</button>
              </form>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[1fr,1.5fr,1fr,0.5fr] col-header bg-white/5 border-b border-white/5 divide-x divide-white/5">
                <div className="p-4">Stakeholder</div>
                <div className="p-4">Communication Link</div>
                <div className="p-4">Connectivity</div>
                <div className="p-4 text-right">Manage</div>
              </div>
              <div className="divide-y divide-white/5">
                {members.map(member => (
                  <div key={member.id} className="grid grid-cols-[1fr,1.5fr,1fr,0.5fr] data-row p-0 border-0 group hover:bg-white/[0.02] divide-x divide-white/5">
                    {editingMemberId === member.id ? (
                      <>
                        <div className="p-4">
                          <input value={editName} onChange={e => setEditName(e.target.value)} className="input-technical py-0.5" />
                        </div>
                        <div className="p-4">
                          <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="input-technical py-0.5 text-xs" />
                        </div>
                        <div className="p-4">
                          <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="input-technical py-0.5 text-xs" />
                        </div>
                        <div className="p-4 flex gap-4 justify-end">
                          <button onClick={() => handleUpdateMember(member.id)} className="text-emerald-500 hover:scale-110 transition-transform">
                            <Check size={18} />
                          </button>
                          <button onClick={() => setEditingMemberId(null)} className="text-red-500 hover:scale-110 transition-transform">
                            <CloseIcon size={18} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-4 font-bold text-zinc-200 flex items-center">{member.name}</div>
                        <div className="p-4 data-value text-xs text-zinc-500 flex items-center">{member.email}</div>
                        <div className="p-4 data-value text-xs text-zinc-500 flex items-center">{member.phone || 'NOT SET'}</div>
                        <div className="p-4 flex gap-4 justify-end items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditMember(member)} className="text-blue-400 hover:text-blue-300 transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteMember(member.id)} className="text-red-500/50 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/5">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">Active Chits</h2>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Configure financial cycles</p>
            </div>
            <button 
              onClick={() => setShowGroupForm(!showGroupForm)} 
              className="btn-technical flex items-center gap-2"
            >
              {showGroupForm ? <CloseIcon size={16} /> : <Plus size={16} />}
              {showGroupForm ? 'Cancel' : 'Initialize Chit'}
            </button>
          </div>

          {showGroupForm && (
            <div className="glass-panel p-8 max-w-3xl animate-in zoom-in-95 duration-200">
              <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-8">Initialize Financial Chit</h3>
              <form onSubmit={handleCreateGroup} className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="col-header">Chit Identification</label>
                  <input value={groupName} onChange={e => setGroupName(e.target.value)} className="input-technical" placeholder="e.g. Diamond-2026" required />
                </div>
                <div className="space-y-2">
                  <label className="col-header">Aggregate Capacity (INR)</label>
                  <input type="number" value={totalValue} onChange={e => setTotalValue(Number(e.target.value))} className="input-technical" required />
                </div>
                <div className="space-y-2">
                  <label className="col-header">Settlement Cycles (Months)</label>
                  <input type="number" value={months} onChange={e => setMonths(Number(e.target.value))} className="input-technical" required />
                </div>
                <div className="space-y-2">
                  <label className="col-header">Activation Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-technical" required />
                </div>
                <div className="col-span-2 pt-4">
                  <button type="submit" className="btn-technical w-full py-4 text-sm">Deploy Chit</button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[1.5fr,1fr,1fr,1fr,1fr,0.5fr] col-header bg-white/5 border-b border-white/5 divide-x divide-white/5">
                <div className="p-4">Chit Identity</div>
                <div className="p-4">Lump Sum</div>
                <div className="p-4">Slots</div>
                <div className="p-4">Cycles</div>
                <div className="p-4">Activation</div>
                <div className="p-4 text-right">Manage</div>
              </div>
              <div className="divide-y divide-white/5">
                {groups.map(group => (
                  <div key={group.id} className="grid grid-cols-[1.5fr,1fr,1fr,1fr,1fr,0.5fr] data-row p-0 border-0 group hover:bg-white/[0.02] divide-x divide-white/5">
                    {editingGroupId === group.id ? (
                      <>
                        <div className="p-4">
                          <input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} className="input-technical py-0.5 text-xs" />
                        </div>
                        <div className="p-4">
                          <input type="number" value={editTotalValue} onChange={e => setEditTotalValue(Number(e.target.value))} className="input-technical py-0.5 text-xs" />
                        </div>
                        <div className="p-4 flex items-center">
                          <div className="text-[10px] text-zinc-600 font-mono italic">SYNCED</div>
                        </div>
                        <div className="p-4">
                          <input type="number" value={editMonths} onChange={e => setEditMonths(Number(e.target.value))} className="input-technical py-0.5 text-xs" />
                        </div>
                        <div className="p-4">
                          <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="input-technical py-0.5 text-[9px]" />
                        </div>
                        <div className="p-4 flex gap-4 justify-end items-center">
                          <button onClick={() => handleUpdateGroup(group.id)} className="text-emerald-500 hover:scale-110 transition-transform">
                            <Check size={18} />
                          </button>
                          <button onClick={() => setEditingGroupId(null)} className="text-red-500 hover:scale-110 transition-transform">
                            <CloseIcon size={18} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-4 font-bold text-zinc-200 flex items-center">{group.name}</div>
                        <div className="p-4 data-value text-blue-400 flex items-center font-bold">₹{group.totalChitValue.toLocaleString()}</div>
                        <div className="p-4 data-value text-zinc-400 flex items-center">{group.totalSlots}</div>
                        <div className="p-4 data-value text-zinc-400 flex items-center">{group.totalMonths} MO</div>
                        <div className="p-4 data-value text-[10px] text-zinc-500 uppercase tracking-widest flex items-center">{group.startDate.toDate().toLocaleDateString()}</div>
                        <div className="p-4 flex gap-4 justify-end items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditGroup(group)} className="text-blue-400 hover:text-blue-300 transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteGroup(group.id)} className="text-red-500/50 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="space-y-8">
          <div className="glass-panel p-8 shadow-2xl shadow-blue-500/5">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <UserPlus size={20} />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Stakeholder Enrollment</h2>
            </div>
            
            <form onSubmit={handleAssignMember} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="col-header">Target Chit</label>
                <select 
                  className="input-technical" 
                  value={selectedGroup} 
                  onChange={e => setSelectedGroup(e.target.value)}
                  required
                >
                  <option value="" className="bg-[#161b22]">-- Choose Chit --</option>
                  {groups.map(g => <option key={g.id} value={g.id} className="bg-[#161b22]">{g.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="col-header">Stakeholder Entity</label>
                <select 
                  className="input-technical" 
                  value={selectedMember} 
                  onChange={e => setSelectedMember(e.target.value)}
                  required
                >
                  <option value="" className="bg-[#161b22]">-- Select Entity --</option>
                  {members.map(m => <option key={m.id} value={m.id} className="bg-[#161b22]">{m.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="col-header">Holding Units (Slots)</label>
                <input type="number" min="1" value={slots} onChange={e => setSlots(Number(e.target.value))} className="input-technical" required />
              </div>
              <button type="submit" className="btn-technical py-3 text-sm">Assign Capacity</button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
              <Info size={14} /> Current Resource Distribution
            </div>
            
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-[1fr,2.5fr,0.5fr] p-5 col-header bg-white/5 border-b border-white/5">
                  <div>Entity Name</div>
                  <div>Assigned Capacities</div>
                  <div className="text-right">Aggregate Units</div>
                </div>
                <div className="divide-y divide-white/5">
                  {members.map(member => {
                    const memberMships = allMemberships.filter(m => m.memberId === member.id);
                    if (memberMships.length === 0) return null;

                    return (
                      <div key={member.id} className="grid grid-cols-[1fr,2.5fr,0.5fr] data-row border-0 items-start hover:bg-white/[0.03]">
                        <div className="font-bold text-zinc-200 py-1">{member.name}</div>
                        <div className="space-y-2">
                          {memberMships.map(mship => {
                            const group = groups.find(g => g.id === mship.groupId);
                            return (
                              <div key={mship.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 group">
                                <span className="font-semibold text-zinc-400">{group?.name || 'TERMINATED CHIT'}</span>
                                <div className="flex items-center gap-6">
                                  <span className="data-value text-blue-400 font-bold">{mship.slots} {mship.slots === 1 ? 'UNIT' : 'UNITS'}</span>
                                  <button 
                                    onClick={() => handleDeleteAssignment(mship.id)}
                                    className="p-2 mr-1 rounded-lg bg-red-500/5 text-red-500/60 hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center justify-center group/del"
                                    title="Revoke Assignment"
                                  >
                                    <Trash2 size={16} className="group-hover/del:scale-110 transition-transform" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-right font-mono font-bold text-xl text-blue-500/80 mr-2 py-1">
                          {memberMships.reduce((acc, m) => acc + m.slots, 0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {allMemberships.length === 0 && (
                  <div className="p-16 text-center text-zinc-700 italic text-xs tracking-[0.3em] uppercase">No active enrollments detected</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'access' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="glass-panel p-8 shadow-2xl shadow-blue-500/5">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <MailPlus size={20} />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Access Control Protocol</h2>
            </div>
            
            <form onSubmit={handleAddAuthorizedUser} className="flex flex-wrap gap-4 max-w-4xl">
              <div className="flex-1 min-w-[250px] space-y-2">
                <label className="col-header">Authorized Email Identity</label>
                <input 
                  type="email" 
                  value={newAuthEmail} 
                  onChange={e => setNewAuthEmail(e.target.value)} 
                  className="input-technical" 
                  placeholder="e.g. user@domain.com" 
                  required 
                />
              </div>
              <div className="min-w-[200px] space-y-2">
                <label className="col-header">Clearance Level</label>
                <select 
                  value={newAuthRole} 
                  onChange={e => setNewAuthRole(e.target.value as UserRole)} 
                  className="input-technical"
                  required
                >
                  <option value={UserRole.DISPLAY} className="bg-[#161b22]">Display Only (Read-Only)</option>
                  <option value={UserRole.MANAGER} className="bg-[#161b22]">System Manager (Full Ops)</option>
                </select>
              </div>
              <button type="submit" className="btn-technical self-end py-3 px-8 text-sm">Whitelisting</button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
              Authorized System Operators
            </div>
            
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20">
              <div className="grid grid-cols-[1fr,1fr,0.5fr] col-header bg-white/5 border-b border-white/5 p-4">
                <div>Email Identity</div>
                <div>Clearance</div>
                <div className="text-right">Manage Access</div>
              </div>
              <div className="divide-y divide-white/5">
                {authorizedUsers.map(user => (
                  <div key={user.id} className="grid grid-cols-[1fr,1fr,0.5fr] p-4 items-center group hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] ${user.role === UserRole.MANAGER ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                      <span className="font-mono text-zinc-300">{user.email}</span>
                    </div>
                    <div>
                      <span className={`text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full ${user.role === UserRole.MANAGER ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={() => handleRemoveAuthorizedUser(user.id)}
                        className="p-2 text-red-500/30 hover:text-red-500 transition-all rounded-lg hover:bg-red-500/10"
                        title="Revoke Identity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {authorizedUsers.length === 0 && (
                  <div className="p-12 text-center text-zinc-600 italic text-xs tracking-widest uppercase">
                    No authorized operators found beyond primary administrator
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
