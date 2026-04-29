import React, { useState, useEffect } from "react";
import { Plus, X, Trash2, Save, Settings, BookOpen, GitBranch, Loader2, Clock, Pencil, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { settingsService, timetableService } from "../firebase/services";

const DEFAULT_TIME_SLOTS = [
  "7:00 - 7:55", "7:55 - 8:50", "8:50 - 9:45",
  "10:30 - 11:25", "11:25 - 12:20", "12:20 - 1:15",
  "1:15 - 2:10", "2:10 - 3:05", "3:05 - 4:00", "4:00 - 4:55"
];
const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EMPTY_PRESET = { class: "", branch: "", semester: "", type: "full-time", days: ["Mon","Tue","Wed","Thu","Fri","Sat"], timeSlots: [...DEFAULT_TIME_SLOTS] };

const AdminSettings = () => {
  const [programs, setPrograms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Timetable Presets
  const [presets, setPresets] = useState([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [editingPreset, setEditingPreset] = useState(null); // { originalId, data }
  const [addingPreset, setAddingPreset] = useState(false);
  const [newPreset, setNewPreset] = useState(EMPTY_PRESET);
  const [presetError, setPresetError] = useState("");
  const [presetSaving, setPresetSaving] = useState(false);
  const [expandedPreset, setExpandedPreset] = useState(null);
  const [newTimeSlot, setNewTimeSlot] = useState("");
  
  // New program form
  const [newProgram, setNewProgram] = useState("");
  const [addingProgram, setAddingProgram] = useState(false);
  
  // New branch form
  const [newBranch, setNewBranch] = useState({
    name: "",
    programs: [],
  });
  const [addingBranch, setAddingBranch] = useState(false);

  useEffect(() => {
    loadSettings();
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setPresetsLoading(true);
      const data = await timetableService.listAllTimetablesMeta();
      setPresets(data);
    } catch (e) {
      console.error("Error loading presets:", e);
    } finally {
      setPresetsLoading(false);
    }
  };

  const handleAddPreset = async () => {
    setPresetError("");
    if (!newPreset.class.trim() || !newPreset.branch.trim() || !newPreset.semester.trim()) {
      setPresetError("Class, Branch and Semester are required."); return;
    }
    try {
      setPresetSaving(true);
      await timetableService.createTimetablePreset(newPreset);
      setNewPreset(EMPTY_PRESET);
      setAddingPreset(false);
      await loadPresets();
    } catch (e) {
      setPresetError(e.message || "Failed to create preset.");
    } finally {
      setPresetSaving(false);
    }
  };

  const handleStartEdit = (preset) => {
    setEditingPreset({ originalId: preset.timetableId, data: { ...preset, days: preset.days || ["Mon","Tue","Wed","Thu","Fri","Sat"], timeSlots: preset.timeSlots || [...DEFAULT_TIME_SLOTS] } });
    setPresetError("");
  };

  const handleSaveEdit = async () => {
    setPresetError("");
    const { originalId, data } = editingPreset;
    if (!data.class.trim() || !data.branch.trim() || !data.semester.trim()) {
      setPresetError("Class, Branch and Semester are required."); return;
    }
    try {
      setPresetSaving(true);
      await timetableService.updateTimetableMeta(originalId, data);
      setEditingPreset(null);
      await loadPresets();
    } catch (e) {
      setPresetError(e.message || "Failed to save.");
    } finally {
      setPresetSaving(false);
    }
  };

  const handleDeletePreset = async (timetableId) => {
    if (!confirm(`Delete timetable preset "${timetableId}"?\n\nThis only removes the preset. Existing schedules are NOT deleted.`)) return;
    try {
      setPresetSaving(true);
      await timetableService.deleteTimetable(timetableId);
      await loadPresets();
    } catch (e) {
      alert("Failed to delete preset: " + e.message);
    } finally {
      setPresetSaving(false);
    }
  };

  const toggleDay = (day, isEdit) => {
    if (isEdit) {
      setEditingPreset(prev => {
        const days = prev.data.days.includes(day) ? prev.data.days.filter(d => d !== day) : [...prev.data.days, day];
        return { ...prev, data: { ...prev.data, days } };
      });
    } else {
      setNewPreset(prev => {
        const days = prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day];
        return { ...prev, days };
      });
    }
  };

  const addTimeSlot = (isEdit) => {
    const slot = newTimeSlot.trim();
    if (!slot) return;
    if (isEdit) {
      setEditingPreset(prev => ({ ...prev, data: { ...prev.data, timeSlots: [...(prev.data.timeSlots || []), slot] } }));
    } else {
      setNewPreset(prev => ({ ...prev, timeSlots: [...prev.timeSlots, slot] }));
    }
    setNewTimeSlot("");
  };

  const removeTimeSlot = (idx, isEdit) => {
    if (isEdit) {
      setEditingPreset(prev => ({ ...prev, data: { ...prev.data, timeSlots: prev.data.timeSlots.filter((_, i) => i !== idx) } }));
    } else {
      setNewPreset(prev => ({ ...prev, timeSlots: prev.timeSlots.filter((_, i) => i !== idx) }));
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await settingsService.getAllSettings();
      setPrograms(settings.programs || []);
      setBranches(settings.branches || []);
    } catch (error) {
      console.error("Error loading settings:", error);
      alert("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  // Program Management
  const handleAddProgram = async () => {
    if (!newProgram.trim()) {
      alert("Please enter a program name");
      return;
    }

    if (programs.includes(newProgram.trim())) {
      alert("This program already exists");
      return;
    }

    try {
      setSaving(true);
      const updatedPrograms = [...programs, newProgram.trim()];
      await settingsService.savePrograms(updatedPrograms);
      setPrograms(updatedPrograms);
      setNewProgram("");
      setAddingProgram(false);
    } catch (error) {
      console.error("Error adding program:", error);
      alert("Failed to add program");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProgram = async (programToDelete) => {
    if (!confirm(`Are you sure you want to delete "${programToDelete}"?`)) {
      return;
    }

    try {
      setSaving(true);
      const updatedPrograms = programs.filter((p) => p !== programToDelete);
      
      // Also remove this program from branches
      const updatedBranches = branches.map((branch) => ({
        ...branch,
        programs: branch.programs.filter((p) => p !== programToDelete),
      }));

      await Promise.all([
        settingsService.savePrograms(updatedPrograms),
        settingsService.saveBranches(updatedBranches),
      ]);

      setPrograms(updatedPrograms);
      setBranches(updatedBranches);
    } catch (error) {
      console.error("Error deleting program:", error);
      alert("Failed to delete program");
    } finally {
      setSaving(false);
    }
  };

  // Branch Management
  const handleAddBranch = async () => {
    if (!newBranch.name.trim()) {
      alert("Please enter a branch name");
      return;
    }

    if (newBranch.programs.length === 0) {
      alert("Please select at least one program");
      return;
    }

    if (branches.some((b) => b.name === newBranch.name.trim())) {
      alert("This branch already exists");
      return;
    }

    try {
      setSaving(true);
      const updatedBranches = [
        ...branches,
        {
          name: newBranch.name.trim(),
          programs: newBranch.programs,
        },
      ];
      await settingsService.saveBranches(updatedBranches);
      setBranches(updatedBranches);
      setNewBranch({ name: "", programs: [] });
      setAddingBranch(false);
    } catch (error) {
      console.error("Error adding branch:", error);
      alert("Failed to add branch");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBranch = async (branchName) => {
    if (!confirm(`Are you sure you want to delete "${branchName}"?`)) {
      return;
    }

    try {
      setSaving(true);
      const updatedBranches = branches.filter((b) => b.name !== branchName);
      await settingsService.saveBranches(updatedBranches);
      setBranches(updatedBranches);
    } catch (error) {
      console.error("Error deleting branch:", error);
      alert("Failed to delete branch");
    } finally {
      setSaving(false);
    }
  };

  const toggleProgramForBranch = (program) => {
    setNewBranch((prev) => {
      const programs = prev.programs.includes(program)
        ? prev.programs.filter((p) => p !== program)
        : [...prev.programs, program];
      return { ...prev, programs };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
          </div>
          <p className="text-gray-600">Manage programs and branches</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Programs Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Programs</h2>
              </div>
              {!addingProgram && (
                <button
                  onClick={() => setAddingProgram(true)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Add Program
                </button>
              )}
            </div>

            {/* Add Program Form */}
            {addingProgram && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    placeholder="e.g., B.Tech, M.Tech, BCA"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === "Enter" && handleAddProgram()}
                  />
                  <button
                    onClick={handleAddProgram}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setAddingProgram(false);
                      setNewProgram("");
                    }}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Programs List */}
            <div className="space-y-2">
              {programs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No programs defined yet
                </div>
              ) : (
                programs.map((program) => (
                  <div
                    key={program}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{program}</span>
                    <button
                      onClick={() => handleDeleteProgram(program)}
                      disabled={saving}
                      className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Branches Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Branches</h2>
              </div>
              {!addingBranch && (
                <button
                  onClick={() => setAddingBranch(true)}
                  disabled={saving || programs.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  title={programs.length === 0 ? "Add programs first" : ""}
                >
                  <Plus className="w-4 h-4" />
                  Add Branch
                </button>
              )}
            </div>

            {/* Add Branch Form */}
            {addingBranch && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <input
                  type="text"
                  value={newBranch.name}
                  onChange={(e) =>
                    setNewBranch({ ...newBranch, name: e.target.value })
                  }
                  placeholder="e.g., Computer Science, Mechanical"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent mb-3"
                />

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Programs
                  </label>
                  <div className="space-y-2">
                    {programs.map((program) => (
                      <label
                        key={program}
                        className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newBranch.programs.includes(program)}
                          onChange={() => toggleProgramForBranch(program)}
                          className="h-4 w-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">{program}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAddBranch}
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setAddingBranch(false);
                      setNewBranch({ name: "", programs: [] });
                    }}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Branches List */}
            <div className="space-y-3">
              {branches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No branches defined yet
                </div>
              ) : (
                branches.map((branch) => (
                  <div
                    key={branch.name}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {branch.name}
                      </span>
                      <button
                        onClick={() => handleDeleteBranch(branch.name)}
                        disabled={saving}
                        className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {branch.programs.map((program) => (
                        <span
                          key={program}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                        >
                          {program}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Timetable Presets Section ── */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Timetable Presets</h2>
              <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">{presets.length} presets</span>
            </div>
            {!addingPreset && !editingPreset && (
              <button onClick={() => { setAddingPreset(true); setNewPreset(EMPTY_PRESET); setPresetError(""); }}
                disabled={presetSaving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50">
                <Plus className="w-4 h-4" /> Add Preset
              </button>
            )}
          </div>

          {presetError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{presetError}</div>
          )}

          {/* Add Preset Form */}
          {addingPreset && (
            <div className="mb-6 p-5 bg-purple-50 border border-purple-200 rounded-lg space-y-4">
              <h3 className="font-semibold text-purple-800 text-sm uppercase tracking-wide">New Timetable Preset</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Class / Program *</label>
                  <input type="text" value={newPreset.class} onChange={e => setNewPreset(p => ({...p, class: e.target.value}))}
                    placeholder="e.g. B.Tech" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Branch *</label>
                  <input type="text" value={newPreset.branch} onChange={e => setNewPreset(p => ({...p, branch: e.target.value}))}
                    placeholder="e.g. Computer Science" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Semester *</label>
                  <input type="text" value={newPreset.semester} onChange={e => setNewPreset(p => ({...p, semester: e.target.value}))}
                    placeholder="e.g. 1" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select value={newPreset.type} onChange={e => setNewPreset(p => ({...p, type: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    <option value="full-time">Full Time</option>
                    <option value="part-time">Part Time</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Days</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map(day => (
                    <button key={day} type="button" onClick={() => toggleDay(day, false)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        newPreset.days.includes(day) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
                      }`}>{day}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Time Slots</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newPreset.timeSlots.map((slot, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs">
                      <Clock className="w-3 h-3 text-gray-400" />{slot}
                      <button onClick={() => removeTimeSlot(i, false)} className="text-red-400 hover:text-red-600 ml-1"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newTimeSlot} onChange={e => setNewTimeSlot(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTimeSlot(false)}
                    placeholder="e.g. 9:00 - 9:55" className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                  <button onClick={() => addTimeSlot(false)} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleAddPreset} disabled={presetSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {presetSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Preset
                </button>
                <button onClick={() => { setAddingPreset(false); setPresetError(""); }} disabled={presetSaving}
                  className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          {/* Presets List */}
          {presetsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : presets.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No timetable presets found. Create one above.</div>
          ) : (
            <div className="space-y-2">
              {presets.map((preset) => {
                const isEditing = editingPreset?.originalId === preset.timetableId;
                const isExpanded = expandedPreset === preset.timetableId;
                return (
                  <div key={preset.timetableId} className={`border rounded-lg overflow-hidden transition-colors ${
                    isEditing ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}>
                    {/* Row Header */}
                    {!isEditing ? (
                      <div className="flex items-center justify-between p-3 gap-3">
                        <button onClick={() => setExpandedPreset(isExpanded ? null : preset.timetableId)}
                          className="flex items-center gap-2 flex-1 text-left">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          <span className="font-medium text-gray-900 text-sm">{preset.class}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-sm text-gray-700">{preset.branch}</span>
                          <span className="text-gray-400">·</span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Sem {preset.semester}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            preset.type === 'full-time' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>{preset.type}</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleStartEdit(preset)} disabled={presetSaving || !!editingPreset || addingPreset}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors disabled:opacity-30">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeletePreset(preset.timetableId)} disabled={presetSaving || !!editingPreset || addingPreset}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Edit Form */
                      <div className="p-4 space-y-4">
                        <h4 className="font-semibold text-purple-800 text-sm">Editing: {editingPreset.originalId}</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Class *</label>
                            <input type="text" value={editingPreset.data.class}
                              onChange={e => setEditingPreset(prev => ({...prev, data: {...prev.data, class: e.target.value}}))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Branch *</label>
                            <input type="text" value={editingPreset.data.branch}
                              onChange={e => setEditingPreset(prev => ({...prev, data: {...prev.data, branch: e.target.value}}))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Semester *</label>
                            <input type="text" value={editingPreset.data.semester}
                              onChange={e => setEditingPreset(prev => ({...prev, data: {...prev.data, semester: e.target.value}}))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                            <select value={editingPreset.data.type}
                              onChange={e => setEditingPreset(prev => ({...prev, data: {...prev.data, type: e.target.value}}))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                              <option value="full-time">Full Time</option>
                              <option value="part-time">Part Time</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">Days</label>
                          <div className="flex flex-wrap gap-2">
                            {ALL_DAYS.map(day => (
                              <button key={day} type="button" onClick={() => toggleDay(day, true)}
                                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                  editingPreset.data.days.includes(day) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300'
                                }`}>{day}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">Time Slots</label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {editingPreset.data.timeSlots.map((slot, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs">
                                <Clock className="w-3 h-3 text-gray-400" />{slot}
                                <button onClick={() => removeTimeSlot(i, true)} className="text-red-400 hover:text-red-600 ml-1"><X className="w-3 h-3" /></button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input type="text" value={newTimeSlot} onChange={e => setNewTimeSlot(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addTimeSlot(true)}
                              placeholder="e.g. 9:00 - 9:55" className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                            <button onClick={() => addTimeSlot(true)} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg"><Plus className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} disabled={presetSaving}
                            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                            {presetSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                          </button>
                          <button onClick={() => { setEditingPreset(null); setPresetError(""); }} disabled={presetSaving}
                            className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                        </div>
                      </div>
                    )}
                    {/* Expanded Details */}
                    {isExpanded && !isEditing && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs font-medium text-gray-500 mr-1">Days:</span>
                          {(preset.days || []).map(d => <span key={d} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{d}</span>)}
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500">Time Slots ({(preset.timeSlots||[]).length}):</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(preset.timeSlots || []).map((s, i) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded flex items-center gap-1">
                                <Clock className="w-3 h-3" />{s}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 font-mono">{preset.timetableId}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminSettings;
