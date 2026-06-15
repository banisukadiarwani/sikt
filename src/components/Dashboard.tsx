import React, { useMemo } from 'react';
import { SIKTState, AnggotaKeluarga } from '../types';
import { Users, Landmark, Calendar, Image as ImageIcon, Archive, TrendingUp, Sparkles, Heart, Cake, Skull, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
  state: SIKTState;
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ state, setActiveTab }: DashboardProps) {
  const { anggota, kasMasuk, kasKeluar, agenda, galeri, dokumen } = state;

  // 1. Calculations: Total Members
  const totalHidup = useMemo(() => anggota.filter(a => a.statusHidup === 'Hidup').length, [anggota]);
  const totalWafat = useMemo(() => anggota.filter(a => a.statusHidup === 'Wafat').length, [anggota]);

  // Calculate Generations
  // Generation is calculated recursively starting from roots (members without parents)
  const generasiMap = useMemo(() => {
    const map: Record<string, number> = {};
    
    // Find absolute roots: people whose father/mother are not in the list or are ""
    const findGen = (member: AnggotaKeluarga): number => {
      if (map[member.id]) return map[member.id];
      
      const ayah = member.ayahId ? anggota.find(a => a.id === member.ayahId) : null;
      const ibu = member.ibuId ? anggota.find(a => a.id === member.ibuId) : null;
      
      if (!ayah && !ibu) {
        map[member.id] = 1; // Root generation
        return 1;
      }
      
      const maxParentGen = Math.max(
        ayah ? findGen(ayah) : 0,
        ibu ? findGen(ibu) : 0
      );
      
      map[member.id] = maxParentGen + 1;
      return maxParentGen + 1;
    };
    
    anggota.forEach(findGen);
    return map;
  }, [anggota]);

  const maxGenerasi = useMemo(() => {
    const vals = Object.values(generasiMap) as number[];
    return vals.length > 0 ? Math.max(...vals) : 0;
  }, [generasiMap]);

  const rataRataUsia = useMemo(() => {
    const livingMembers = anggota.filter(a => a.statusHidup !== 'Wafat' && a.tanggalLahir);
    if (livingMembers.length === 0) return 0;
    const currentYear = new Date().getFullYear();
    const totalAge = livingMembers.reduce((sum, m) => {
      const birthYear = parseInt(m.tanggalLahir.split('-')[0], 10);
      return sum + (currentYear - birthYear);
    }, 0);
    return Math.round(totalAge / livingMembers.length);
  }, [anggota]);

  // 2. Calculations: Kas Balance
  const totalMasuk = useMemo(() => kasMasuk.reduce((sum, item) => sum + item.nominal, 0), [kasMasuk]);
  const totalKeluar = useMemo(() => kasKeluar.reduce((sum, item) => sum + item.nominal, 0), [kasKeluar]);
  const saldoKas = useMemo(() => totalMasuk - totalKeluar, [totalMasuk, totalKeluar]);

  // 3. Next Agenda
  const upcomingAgenda = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sorted = [...agenda].filter(a => a.tanggal >= today)
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    return sorted.length > 0 ? sorted[0] : null;
  }, [agenda]);

  // 4. RSVP stats for the next agenda item
  const rsvpStats = useMemo(() => {
    if (!upcomingAgenda) return { hadir: 0, rsvp: 0, total: 0 };
    const peserta = state.pesertaAcara.filter(p => p.agendaId === upcomingAgenda.id);
    const hadir = peserta.filter(p => p.statusHadir === 'Hadir').length;
    const rsvp = peserta.filter(p => p.statusHadir !== 'Belum RSVP').length;
    return {
      hadir,
      rsvp,
      total: peserta.length || anggota.length
    };
  }, [upcomingAgenda, state.pesertaAcara, anggota]);

  // 5. Monthly Cashflow Data for Chart
  const financialChartData = useMemo(() => {
    const data: Record<string, { bulan: string; Pemasukan: number; Pengeluaran: number }> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    
    // Group Kas Masuk
    kasMasuk.forEach(km => {
      const parts = km.tanggal.split('-');
      if (parts.length >= 2) {
        const year = parts[0];
        if (year === '2026') { // Filter to 2026
          const monthIndex = parseInt(parts[1], 10) - 1;
          const monthName = months[monthIndex];
          if (!data[monthName]) {
            data[monthName] = { bulan: monthName, Pemasukan: 0, Pengeluaran: 0 };
          }
          data[monthName].Pemasukan += km.nominal;
        }
      }
    });

    // Group Kas Keluar
    kasKeluar.forEach(kk => {
      const parts = kk.tanggal.split('-');
      if (parts.length >= 2) {
        const year = parts[0];
        if (year === '2026') {
          const monthIndex = parseInt(parts[1], 10) - 1;
          const monthName = months[monthIndex];
          if (!data[monthName]) {
            data[monthName] = { bulan: monthName, Pemasukan: 0, Pengeluaran: 0 };
          }
          data[monthName].Pengeluaran += kk.nominal;
        }
      }
    });

    // Sort or fill missing months
    return months.map(m => data[m] || { bulan: m, Pemasukan: 0, Pengeluaran: 0 });
  }, [kasMasuk, kasKeluar]);

  // 6. Gender distribution
  const genderData = useMemo(() => {
    const l = anggota.filter(a => a.gender === 'Laki-laki').length;
    const p = anggota.filter(a => a.gender === 'Perempuan').length;
    return [
      { name: 'Laki-laki', value: l },
      { name: 'Perempuan', value: p }
    ];
  }, [anggota]);

  const COLORS = ['#0284c7', '#ec4899'];

  // 7. Timeline events
  const timelineEvents = useMemo(() => {
    interface TimelineItem {
      tanggal: string;
      tahun: string;
      tipe: 'Kelahiran' | 'Pernikahan' | 'Wafat' | 'Pindah Rumah' | 'Milestone';
      icon: React.ReactNode;
      judul: string;
      deskripsi: string;
    }

    const items: TimelineItem[] = [];

    // Kelahiran & Wafat
    anggota.forEach(a => {
      if (a.tanggalLahir) {
        const birthYear = a.tanggalLahir.split('-')[0];
        items.push({
          tanggal: a.tanggalLahir,
          tahun: birthYear,
          tipe: 'Kelahiran',
          icon: <span className="p-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">Lahir</span>,
          judul: `Kelahiran ${a.nama}`,
          deskripsi: `Lahir di ${a.tempatLahir} pada ${new Date(a.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
        });
      }
      if (a.statusHidup === 'Wafat' && a.tanggalWafat) {
        const deathYear = a.tanggalWafat.split('-')[0];
        items.push({
          tanggal: a.tanggalWafat,
          tahun: deathYear,
          tipe: 'Wafat',
          icon: <span className="p-1.5 rounded-full bg-stone-100 text-stone-700 text-xs font-semibold">Wafat</span>,
          judul: `Wafatnya ${a.nama}`,
          deskripsi: `Wafat pada tanggal ${new Date(a.tanggalWafat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
        });
      }
    });

    // Static iconic family weddings / milestone events based on our seeds
    items.push({
      tanggal: '1967-08-24',
      tahun: '1967',
      tipe: 'Pernikahan',
      icon: <span className="p-1.5 rounded-full bg-pink-100 text-pink-700 text-xs font-semibold">Nikah</span>,
      judul: 'Pernikahan Emas Rustam Effendi & Siti Aminah',
      deskripsi: 'Awal mula berdirinya keluarga besar Effendi, dilangsungkan dengan khidmat di kota Solo.'
    });

    items.push({
      tanggal: '1994-06-12',
      tahun: '1994',
      tipe: 'Pernikahan',
      icon: <span className="p-1.5 rounded-full bg-pink-100 text-pink-700 text-xs font-semibold">Nikah</span>,
      judul: 'Pernikahan Budi Effendi & Rina Kartika',
      deskripsi: 'Pernikahan anak sulung keluarga besar Rustam Effendi di Bandung.'
    });

    items.push({
      tanggal: '2012-05-10',
      tahun: '2012',
      tipe: 'Pindah Rumah',
      icon: <span className="p-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">Rumah</span>,
      judul: 'Pembelian Rumah Kebagusan',
      deskripsi: 'Keluarga Budi Effendi pindah domisili dari Yogyakarta ke Kebagusan, Jakarta Selatan.'
    });

    return items.sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 7);
  }, [anggota]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner / Hero Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-8 bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 text-white rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>
        
        <div className="relative z-10 space-y-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3 animate-pulse">
              <Sparkles className="h-3 w-3" /> Dashboard Terpadu
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
              Selamat Datang di SIKT
            </h1>
            <p className="text-slate-300 mt-2 max-w-xl text-xs sm:text-sm leading-relaxed">
              Sistem Informasi Keluarga Terpadu &ndash; media silaturahmi digital, pencatatan silsilah, kas bersama, agenda pertemuan, dan arsip kenangan keluarga.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button 
              onClick={() => setActiveTab('silsilah')}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950/40 hover:shadow-emerald-950/60 transform hover:-translate-y-0.5 transition duration-200 flex items-center gap-2 cursor-pointer"
            >
              <Users className="h-4.5 w-4.5 text-emerald-100" /> Buka Silsilah Keluarga
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Card Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1 */}
        <div 
          onClick={() => setActiveTab('silsilah')}
          className="p-4 bg-white rounded-xl border border-slate-100 shadow-2xs hover:shadow-xs transition cursor-pointer hover:border-emerald-200 group"
        >
          <div className="flex justify-between items-start">
            <span className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition">
              <Users className="h-5 w-5" />
            </span>
            <span className="text-xs font-mono text-emerald-600 font-semibold bg-emerald-50/50 px-2 py-0.5 rounded">
              L: {totalHidup} | W: {totalWafat}
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-500">Anggota Keluarga</h3>
            <p className="text-2xl font-bold text-slate-800 mt-1">{anggota.length}</p>
            <p className="text-xs text-slate-400 mt-1">Rentang {maxGenerasi} Generasi</p>
          </div>
        </div>

        {/* Card 2 */}
        <div 
          onClick={() => setActiveTab('kas')}
          className="p-4 bg-white rounded-xl border border-slate-100 shadow-2xs hover:shadow-xs transition cursor-pointer hover:border-teal-200 group"
        >
          <div className="flex justify-between items-start">
            <span className="p-2.5 rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition">
              <Landmark className="h-5 w-5" />
            </span>
            <span className="text-xs font-mono text-slate-400">
              Total Kas
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-500">Saldo Kas Bersama</h3>
            <p className="text-[20px] font-bold text-slate-800 mt-1 truncate">
              Rp {saldoKas.toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-slate-400 mt-1">Pemasukan sehat</p>
          </div>
        </div>

        {/* Card 3 */}
        <div 
          onClick={() => setActiveTab('agenda')}
          className="p-4 bg-white rounded-xl border border-slate-100 shadow-2xs hover:shadow-xs transition cursor-pointer hover:border-indigo-200 group"
        >
          <div className="flex justify-between items-start">
            <span className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition">
              <Calendar className="h-5 w-5" />
            </span>
            <span className="text-xs font-mono text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">
              {agenda.length} Agenda
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-500">Agenda Terdekat</h3>
            <p className="text-[13px] font-bold text-slate-800 mt-1 truncate">
              {upcomingAgenda ? upcomingAgenda.namaAcara : 'Tidak ada agenda'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {upcomingAgenda ? upcomingAgenda.tanggal : '-'}
            </p>
          </div>
        </div>

        {/* Card 4 */}
        <div 
          onClick={() => setActiveTab('galeri')}
          className="p-4 bg-white rounded-xl border border-slate-100 shadow-2xs hover:shadow-xs transition cursor-pointer hover:border-pink-200 group"
        >
          <div className="flex justify-between items-start">
            <span className="p-2.5 rounded-lg bg-pink-50 text-pink-600 group-hover:bg-pink-100 transition">
              <ImageIcon className="h-5 w-5" />
            </span>
            <span className="text-xs font-mono text-slate-400">
              Kenangan
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-500">Galeri Foto</h3>
            <p className="text-2xl font-bold text-slate-800 mt-1">{galeri.length}</p>
            <p className="text-xs text-slate-400 mt-1">Dokumentasi Acara</p>
          </div>
        </div>

        {/* Card 5 */}
        <div 
          onClick={() => setActiveTab('dokumen')}
          className="p-4 bg-white rounded-xl border border-slate-100 shadow-2xs hover:shadow-xs transition cursor-pointer hover:border-amber-200 group"
        >
          <div className="flex justify-between items-start">
            <span className="p-2.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition">
              <Archive className="h-5 w-5" />
            </span>
            <span className="text-xs font-mono text-slate-400">
              Arsip
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-500">Arsip Dokumen</h3>
            <p className="text-2xl font-bold text-slate-800 mt-1">{dokumen.length}</p>
            <p className="text-xs text-slate-400 mt-1">Notulen & Sertifikat</p>
          </div>
        </div>
      </div>

      {/* Main Row: Chart & Demographic */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Bar Chart */}
        <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-slate-100 shadow-2xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-display font-bold text-slate-800 tracking-tight flex items-center gap-1.5 text-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" /> Arus Keuangan Keluarga (2026)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Grafik perbandingan pendapatan dan pengeluaran per bulan</p>
            </div>
            <span className="text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-100 rounded px-2.5 py-1 font-bold">
              Saldo: Rp {saldoKas.toLocaleString('id-ID')}
            </span>
          </div>
          
          <div className="h-72 w-full font-sans">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={financialChartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bulan" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 13 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any) => `Rp ${value.toLocaleString('id-ID')}`}
                  contentStyle={{ background: '#ffffff', borderRadius: 8, borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pengeluaran" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demographic & RSVPs Section */}
        <div className="space-y-6">
          {/* RSVP Status / Next Event Box */}
          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-2xs flex flex-col justify-between">
            <div>
              <h2 className="font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                <Calendar className="h-5 w-5 text-indigo-600" /> Presensi Agenda Terdekat
              </h2>
              {upcomingAgenda ? (
                <div className="mt-4">
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                    <p className="text-sm font-semibold text-indigo-900">{upcomingAgenda.namaAcara}</p>
                    <p className="text-xs text-indigo-700/80 mt-1 font-mono">📅 {upcomingAgenda.tanggal} &bull; 🕒 {upcomingAgenda.waktu}</p>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>Progres RSVP Kehadiran</span>
                      <span>{rsvpStats.hadir} Konfirmasi Hadir / {rsvpStats.total} Anggota</span>
                    </div>
                    {/* Native visual progress bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-2.5 rounded-full" 
                        style={{ width: `${(rsvpStats.hadir / rsvpStats.total) * 100 || 0}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-indigo-600 font-semibold">{Math.round((rsvpStats.hadir / rsvpStats.total) * 100) || 0}% Bersedia Datang</span>
                      <button 
                        onClick={() => setActiveTab('agenda')}
                        className="text-[11px] font-bold text-indigo-600 hover:underline"
                      >
                        Kelola RSVP &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-4 italic">Belum ada agenda terdekat yang dijadwalkan.</p>
              )}
            </div>
          </div>

          {/* Demografi & Karakteristik Section */}
          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-2xs">
            <h2 className="font-display font-extrabold text-slate-800 text-lg leading-tight mb-4 border-b border-slate-100/60 pb-3">
              Demografi & Karakteristik
            </h2>
            
            {/* Gender Ratio Header Row */}
            <div className="flex justify-between items-center text-xs mt-2">
              <span className="font-semibold text-slate-400">Rasio Gender</span>
              <span className="font-semibold text-slate-500">
                Laki-laki {genderData[0].value} vs Perempuan {genderData[1].value}
              </span>
            </div>

            {/* Custom styled dynamic progress bar */}
            {(() => {
              const totalGender = (genderData[0].value + genderData[1].value) || 1;
              const malePercent = Math.round((genderData[0].value / totalGender) * 100);
              const femalePercent = 100 - malePercent;
              return (
                <>
                  <div className="w-full bg-slate-100 rounded-full h-3 mt-2 overflow-hidden flex">
                    <div 
                      className="bg-blue-600 h-full" 
                      style={{ width: `${(genderData[0].value / totalGender) * 100}%` }}
                    ></div>
                    <div 
                      className="bg-[#ff5d73] h-full" 
                      style={{ width: `${(genderData[1].value / totalGender) * 100}%` }}
                    ></div>
                  </div>

                  {/* Legend Row */}
                  <div className="flex justify-between items-center text-xs text-slate-400 mt-2.5 pb-5 border-b border-slate-100/60 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                      Laki-laki ({malePercent}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#ff5d73]"></span>
                      Perempuan ({femalePercent}%)
                    </span>
                  </div>
                </>
              );
            })()}

            {/* Averages & Statistics Grid */}
            <div className="pt-4 grid grid-cols-2 gap-4">
              {/* Box: Rata-rata Usia */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/70 flex flex-col items-center justify-center text-center space-y-1">
                <Cake className="h-5 w-5 text-blue-600 mb-1" />
                <span className="text-xs font-semibold text-slate-400">Rata-rata Usia</span>
                <span className="font-display font-bold text-[20px] text-slate-800 tracking-tight leading-none pt-1">
                  {rataRataUsia} Tahun
                </span>
              </div>

              {/* Box: Telah Berpulang */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/70 flex flex-col items-center justify-center text-center space-y-1">
                <Skull className="h-5 w-5 text-slate-500 mb-1" />
                <span className="text-xs font-semibold text-slate-400">Telah Berpulang</span>
                <span className="font-display font-bold text-[20px] text-slate-800 tracking-tight leading-none pt-1">
                  {totalWafat} Jiwa
                </span>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50/40 border border-blue-100/60 rounded-2xl p-4 flex items-start gap-3 mt-4">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                <strong className="font-bold text-slate-800">Info Penting:</strong> Sebanyak{" "}
                <strong className="font-bold text-slate-800">
                  {Math.round((totalWafat / (anggota.length || 1)) * 100)}%
                </strong>{" "}
                dari keluarga besar telah wafat. Kami menghormati warisan dan kenangan berharga dengan mendokumentasikan biografi lengkap mereka.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row: Historical Timeline */}
      <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-2xs">
        <h2 className="font-bold text-slate-800 tracking-tight flex items-center gap-1.5 mb-1 text-lg">
          <Heart className="h-5 w-5 text-rose-500" /> Timeline & Milestones Penting
        </h2>
        <p className="text-xs text-slate-400 mb-6">Linimasa peristiwa monumental kelahiran, pernikahan, wafat, dan sejarah keluarga besar Effendi</p>
        
        <div className="relative border-l-2 border-emerald-100 ml-3 pl-6 space-y-6">
          {timelineEvents.map((ev, index) => (
            <div key={`${ev.tanggal}-${index}`} className="relative group">
              {/* Timeline marker */}
              <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs group-hover:scale-135 transition"></div>
              
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      {ev.tahun}
                    </span>
                    {ev.icon}
                  </div>
                  <h4 className="font-bold text-slate-800 text-[15px]">{ev.judul}</h4>
                  <p className="text-sm text-slate-600">{ev.deskripsi}</p>
                </div>
                <span className="font-mono text-xs text-slate-400 whitespace-nowrap bg-slate-50 px-2 py-1 rounded">
                  {new Date(ev.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
