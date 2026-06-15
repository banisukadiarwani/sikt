import React, { useState, useMemo } from 'react';
import { SIKTState, Agenda, PesertaAcara } from '../types';
import { Calendar as CalendarIcon, MapPin, User, Clock, Users, Plus, CheckCircle2, AlertCircle, X, ChevronLeft, ChevronRight, Mail, Sparkles } from 'lucide-react';

interface KalenderKeluargaProps {
  state: SIKTState;
  onUpdateState: (newState: SIKTState) => void;
}

export default function KalenderKeluarga({ state, onUpdateState }: KalenderKeluargaProps) {
  const { agenda, pesertaAcara, anggota } = state;
  const isWritable = state.currentUser?.role === 'Administrator';
  
  // Tab states
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar');
  const [selectedAgendaId, setSelectedAgendaId] = useState<string | null>(agenda[0]?.id || null);

  // Month-view navigation state
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(6); // July (0-indexed 6)

  // Dialog state
  const [isAddingAgenda, setIsAddingAgenda] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);

  // Form State
  const [formAgenda, setFormAgenda] = useState({
    namaAcara: '',
    tanggal: '2026-07-12',
    waktu: '10:00',
    lokasi: '',
    deskripsi: '',
    penanggungJawab: anggota[0]?.nama || '',
  });

  // Highlighted event
  const selectedEvent = useMemo(() => {
    return agenda.find(a => a.id === selectedAgendaId) || null;
  }, [agenda, selectedAgendaId]);

  // RSVPs for selectedEvent
  const eventRSVPs = useMemo(() => {
    if (!selectedEvent) return [];
    return pesertaAcara.filter(p => p.agendaId === selectedEvent.id);
  }, [pesertaAcara, selectedEvent]);

  // Calendar grid date helpers
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Calendar calculations
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayOffset = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay(); // Sunday=0, Monday=1...
  }, [currentYear, currentMonth]);

  const calendarDays = useMemo(() => {
    const cells = [];
    // Pad previous month days blanked
    for (let i = 0; i < firstDayOffset; i++) {
      cells.push({ day: null, dateStr: null });
    }
    // Fill current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dayPad = d.toString().padStart(2, '0');
      const monthPad = (currentMonth + 1).toString().padStart(2, '0');
      const dateStr = `${currentYear}-${monthPad}-${dayPad}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  }, [daysInMonth, firstDayOffset, currentYear, currentMonth]);

  // Map events to dates
  const eventsByDate = useMemo(() => {
    const map: Record<string, Agenda[]> = {};
    agenda.forEach(a => {
      if (!map[a.tanggal]) {
        map[a.tanggal] = [];
      }
      map[a.tanggal].push(a);
    });
    return map;
  }, [agenda]);

  // Save new agenda event
  const handleSaveAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `AG_${Date.now()}`;
    const newEvent: Agenda = {
      id: newId,
      namaAcara: formAgenda.namaAcara,
      tanggal: formAgenda.tanggal,
      waktu: formAgenda.waktu,
      lokasi: formAgenda.lokasi,
      deskripsi: formAgenda.deskripsi,
      penanggungJawab: formAgenda.penanggungJawab,
    };

    // Auto-populate RSVPs for all current family members
    const newRSVPs: PesertaAcara[] = anggota.map((m, idx) => ({
      id: `P_${Date.now()}_${idx}`,
      agendaId: newId,
      anggotaId: m.id,
      anggotaNama: m.nama,
      statusHadir: m.nama === state.currentUser?.nama ? 'Hadir' : 'Belum RSVP',
    }));

    onUpdateState({
      ...state,
      agenda: [...state.agenda, newEvent],
      pesertaAcara: [...state.pesertaAcara, ...newRSVPs],
    });

    setIsAddingAgenda(false);
    setSelectedAgendaId(newId);
    setFormAgenda({
      namaAcara: '',
      tanggal: '2026-07-12',
      waktu: '10:00',
      lokasi: '',
      deskripsi: '',
      penanggungJawab: anggota[0]?.nama || '',
    });
  };

  // User RSVPs updater
  const handleUserRSVP = (status: 'Hadir' | 'Absen' | 'Ragu-ragu') => {
    if (!selectedEvent || !state.currentUser) return;
    
    // Find if user already has an RSVP record, or create one
    const userMember = anggota.find(m => m.nama === state.currentUser?.nama);
    if (!userMember) return;

    let rsvpExists = pesertaAcara.find(p => p.agendaId === selectedEvent.id && p.anggotaId === userMember.id);
    
    let updatedRSVPs = [];
    if (rsvpExists) {
      updatedRSVPs = pesertaAcara.map(p => {
        if (p.id === rsvpExists.id) {
          return { ...p, statusHadir: status };
        }
        return p;
      });
    } else {
      const newRSVP: PesertaAcara = {
        id: `P_${Date.now()}`,
        agendaId: selectedEvent.id,
        anggotaId: userMember.id,
        anggotaNama: userMember.nama,
        statusHadir: status
      };
      updatedRSVPs = [...pesertaAcara, newRSVP];
    }

    onUpdateState({
      ...state,
      pesertaAcara: updatedRSVPs
    });
  };

  // Simulate notification email broadcast via Apps Script
  const triggerEmailNotificationBroadcast = () => {
    if (!selectedEvent) return;
    setEmailStatusMessage("Menginisiasi pengiriman email...");
    
    setTimeout(() => {
      setEmailStatusMessage(
        `✓ EMAIL BERHASIL DIKIRIM!\nApps Script telah mengirimkan undangan email H-30 otomatis ke ${anggota.length} anggota keluarga besar untuk acara "${selectedEvent.namaAcara}".`
      );
    }, 1200);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT & CENTER BODY: Visual Grid Calendar or Lists */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Toggle Headbar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveView('calendar')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === 'calendar' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Mode Kalender Bulanan
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === 'list' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Mode Daftar Jadwal
            </button>
          </div>

          {isWritable && (
            <button
              onClick={() => setIsAddingAgenda(true)}
              className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Tambah Agenda
            </button>
          )}
        </div>

        {/* CALENDAR MONTH GRID VIEW */}
        {activeView === 'calendar' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs space-y-4">
            
            {/* Header navigator */}
            <div className="flex justify-between items-center">
              <h2 className="font-extrabold text-slate-800 text-base">{monthNames[currentMonth]} {currentYear}</h2>
              <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-slate-50">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded transition text-slate-600">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded transition text-slate-600">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Days row header */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 uppercase tracking-wider">
              <div>Min</div>
              <div>Sen</div>
              <div>Sel</div>
              <div>Rab</div>
              <div>Kam</div>
              <div>Jum</div>
              <div>Sab</div>
            </div>

            {/* Calendar dates grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((cell, idx) => {
                const dayEventList = cell.dateStr ? (eventsByDate[cell.dateStr] || []) : [];
                const isSelected = selectedEvent && cell.dateStr === selectedEvent.tanggal;
                
                return (
                  <div
                    key={`${idx}-${cell.day}`}
                    onClick={() => {
                      if (dayEventList.length > 0) {
                        setSelectedAgendaId(dayEventList[0].id);
                      }
                    }}
                    className={`h-20 p-1.5 border rounded-xl flex flex-col justify-between transition-all ${
                      !cell.day ? 'bg-slate-50/50 border-transparent' : 
                      dayEventList.length > 0 ? 'bg-emerald-50/60 border-emerald-200 cursor-pointer hover:bg-emerald-100/60' : 
                      'bg-white border-slate-100 hover:border-slate-300'
                    } ${isSelected ? 'ring-2 ring-emerald-600 border-transparent shadow-sm' : ''}`}
                  >
                    <span className={`text-xs font-mono font-medium ${!cell.day ? 'text-transparent' : dayEventList.length > 0 ? 'text-emerald-900 font-bold' : 'text-slate-400'}`}>
                      {cell.day}
                    </span>
                    
                    {dayEventList.length > 0 && (
                      <div className="space-y-0.5">
                        {dayEventList.map(ev => (
                          <div 
                            key={ev.id} 
                            className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate"
                            title={ev.namaAcara}
                          >
                            • {ev.namaAcara.split(' ')[0]}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LIST SCHEDULE AGENDA VIEW */}
        {activeView === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agenda.map(item => {
              const isSelected = selectedAgendaId === item.id;
              const dateObj = new Date(item.tanggal);
              
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedAgendaId(item.id)}
                  className={`p-4 bg-white rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${isSelected ? 'border-emerald-600 shadow-md ring-1 ring-emerald-500/20' : 'border-slate-100 hover:border-slate-300 shadow-3xs'}`}
                >
                  <div>
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-mono font-bold px-2 py-0.5 rounded-full">
                      {dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm mt-3 leading-snug line-clamp-2">{item.namaAcara}</h3>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-3">{item.deskripsi}</p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-dashed border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-medium text-slate-600"><MapPin className="h-3 w-3 shrink-0 text-emerald-600" /> {item.lokasi.split(' ')[0]}...</span>
                    <span className="font-mono bg-slate-50 p-1 px-2 rounded-md">🕒 {item.waktu}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR PANEL: Selected Agenda Details, RSVPs, and Reminders */}
      <div className="lg:col-span-1">
        {selectedEvent ? (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs space-y-5">
            <div>
              <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                DITEL AGENDA
              </span>
              <h2 className="font-extrabold text-slate-800 mt-3 text-base leading-tight">{selectedEvent.namaAcara}</h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{selectedEvent.deskripsi}</p>
            </div>

            {/* Quick specifications */}
            <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Hari & Jam: <strong className="font-mono text-slate-800">{selectedEvent.tanggal} &bull; {selectedEvent.waktu} WIB</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="line-clamp-2">Lokasi: <strong className="text-slate-800">{selectedEvent.lokasi}</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <User className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Penanggungjawab: <strong>{selectedEvent.penanggungJawab}</strong></span>
              </div>
            </div>

            {/* INTERACTIVE RSVP WIDGET CONTAINER */}
            <div className="bg-slate-50/50 p-4 border rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700">Tentukan Kehadiran Anda</span>
              </div>

              {/* Attendance action buttons */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleUserRSVP('Hadir')}
                  className="py-1.5 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-[10px] font-bold transition flex flex-col items-center justify-center shadow-2xs"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 mb-0.5"></span> HADIR
                </button>
                <button
                  onClick={() => handleUserRSVP('Absen')}
                  className="py-1.5 bg-white border border-rose-200 text-rose-800 hover:bg-rose-50 rounded-lg text-[10px] font-bold transition flex flex-col items-center justify-center shadow-2xs"
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500 mb-0.5"></span> ABSEN
                </button>
                <button
                  onClick={() => handleUserRSVP('Ragu-ragu')}
                  className="py-1.5 bg-white border border-amber-200 text-amber-800 hover:bg-amber-50 rounded-lg text-[10px] font-bold transition flex flex-col items-center justify-center shadow-2xs"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500 mb-0.5"></span> RAGU
                </button>
              </div>
            </div>

            {/* RSVP COUNTS & MEMBER STATUS DROPDOWN SECT */}
            <div className="space-y-2 text-xs border-t border-slate-100 pt-4">
              <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider mb-2 block">Daftar Konfirmasi Presensi</span>
              
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {eventRSVPs.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-1.5 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700 truncate">{p.anggotaNama}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                      p.statusHadir === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                      p.statusHadir === 'Absen' ? 'bg-rose-100 text-rose-800' :
                      p.statusHadir === 'Ragu-ragu' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {p.statusHadir}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AUTOMATIC APPS SCRIPT NOTIFICATION TRIGGER BOX */}
            <div className="border-t border-dashed border-slate-200 pt-4 space-y-2.5">
              <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">Pengingat Otomatis (Apps Script)</span>
              
              <p className="text-[11px] text-slate-500 leading-normal">
                Sistem pendukung pengingat otomatis terjadwal H-30, H-14, H-7, dan H-1 via Google Apps Script MailApp API ke seluruh email anggota yang terdaftar.
              </p>

              <button
                onClick={triggerEmailNotificationBroadcast}
                className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/50 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Mail className="h-4 w-4" /> Kirim Undangan Sekarang (H-30)
              </button>

              {emailStatusMessage && (
                <div className="p-3 bg-indigo-950 text-indigo-200 rounded-xl text-[10px] font-mono leading-normal whitespace-pre-line border border-indigo-800/50">
                  {emailStatusMessage}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center text-slate-400 italic">
            Pilih salah satu jadwal agenda untuk memuat detail.
          </div>
        )}
      </div>

      {/* DIALOG ADD AGENDA ACARA */}
      {isAddingAgenda && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="border-b px-5 py-4 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-emerald-600" /> Atur Acara / Agenda Baru
              </h3>
              <button onClick={() => setIsAddingAgenda(false)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAgenda} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Agenda Acara</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Pertemuan Arisan Semester 1"
                  value={formAgenda.namaAcara}
                  onChange={(e) => setFormAgenda({...formAgenda, namaAcara: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal</label>
                  <input 
                    type="date" 
                    required
                    value={formAgenda.tanggal}
                    onChange={(e) => setFormAgenda({...formAgenda, tanggal: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pukul / Waktu</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: 10:00"
                    value={formAgenda.waktu}
                    onChange={(e) => setFormAgenda({...formAgenda, waktu: e.target.value})}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tempat / Lokasi</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Rumah Makan Lesehan, Jaksel"
                  value={formAgenda.lokasi}
                  onChange={(e) => setFormAgenda({...formAgenda, lokasi: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Deskripsi Acara</label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Isi rincian kegiatan acara silsilah..."
                  value={formAgenda.deskripsi}
                  onChange={(e) => setFormAgenda({...formAgenda, deskripsi: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Penanggungjawab</label>
                <select
                  value={formAgenda.penanggungJawab}
                  onChange={(e) => setFormAgenda({...formAgenda, penanggungJawab: e.target.value})}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-emerald-500 bg-white"
                >
                  {anggota.map(m => (
                    <option key={m.id} value={m.nama}>{m.nama}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsAddingAgenda(false)} 
                  className="flex-1 py-2 text-xs font-bold text-slate-500 border rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl"
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
