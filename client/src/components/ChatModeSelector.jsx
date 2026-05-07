import { Globe, FolderOpen } from 'lucide-react';

export default function ChatModeSelector({ selectedMode, selectedProject, projects, onModeChange, onProjectChange, hasGlobalAccess }) {
  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center gap-4">
        {/* Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {hasGlobalAccess && (
            <button
              onClick={() => onModeChange('global')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                selectedMode === 'global'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span className="font-medium">Global Bot</span>
            </button>
          )}
          <button
            onClick={() => onModeChange('project')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              selectedMode === 'project'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span className="font-medium">Project Bot</span>
          </button>
        </div>

        {/* Project Selector (only for project mode) */}
        {selectedMode === 'project' && (
          <div className="flex-1">
            <select
              value={selectedProject || ''}
              onChange={(e) => onProjectChange(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a project...</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Mode Indicator */}
        <div className="ml-auto">
          {selectedMode === 'global' ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
              <Globe className="w-3 h-3" />
              <span>Organization-Wide Search</span>
            </div>
          ) : selectedProject ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
              <FolderOpen className="w-3 h-3" />
              <span>{projects.find(p => p._id === selectedProject)?.name}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
