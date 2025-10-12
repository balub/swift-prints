# STL File Analysis Integration

This document describes the complete integration of STL file analysis with the Swift Prints backend, including real-time updates via WebSocket connections.

## Overview

The STL analysis integration provides:

- **Real-time file analysis** using PrusaSlicer in Docker containers
- **WebSocket updates** for live progress tracking
- **Comprehensive error handling** with user-friendly messages
- **Automatic retry mechanisms** for failed operations
- **Type-safe API integration** with full TypeScript support

## Architecture

### Components

1. **useFileAnalysis Hook** - Main integration hook that orchestrates the analysis process
2. **useAnalysisUpdates Hook** - Handles WebSocket real-time updates
3. **API Client Integration** - HTTP requests to backend analysis endpoints
4. **FileUploadBox Component** - Enhanced with real analysis integration
5. **AnalysisProgress Component** - Real-time progress display

### Data Flow

```
File Upload → Analysis Request → Backend Processing → Real-time Updates → Results Display
     ↓              ↓                    ↓                   ↓              ↓
FileUploadBox → useFileAnalysis → FastAPI Backend → WebSocket → UI Updates
```

## API Endpoints

### Analysis Endpoints

- `POST /api/analysis` - Start STL file analysis
- `GET /api/analysis/jobs/{job_id}/status` - Get analysis job status
- `GET /api/analysis/results/{result_id}` - Get analysis result
- `GET /api/analysis/files/{file_id}/results` - Get all results for a file

### WebSocket Connection

- `WS /api/ws/connect?token={auth_token}` - WebSocket connection with authentication

## Usage Examples

### Basic File Analysis

```typescript
import { useFileAnalysis } from "@/hooks/useFileAnalysis";

function MyComponent() {
  const {
    analyzing,
    progress,
    status,
    result,
    error,
    analyzeFile,
    getAnalysisMetrics,
  } = useFileAnalysis({
    onAnalysisComplete: (result) => {
      console.log("Analysis complete:", result);
    },
    enableRealTimeUpdates: true,
  });

  const handleAnalyze = async (file: UploadedFile) => {
    const settings = {
      layer_height: 0.2,
      infill_density: 20,
      infill_pattern: "grid",
      supports: true,
      bed_adhesion: "brim",
      material_type: "PLA",
      nozzle_temperature: 210,
      bed_temperature: 60,
    };

    try {
      const jobId = await analyzeFile(file, settings);
      console.log("Analysis started:", jobId);
    } catch (error) {
      console.error("Failed to start analysis:", error);
    }
  };

  return (
    <div>
      {analyzing && <div>Progress: {progress}%</div>}
      {result && (
        <div>
          <h3>Analysis Results</h3>
          <pre>{JSON.stringify(getAnalysisMetrics(), null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

### Complete Integration with FileUploadBox

```typescript
import { FileUploadBox } from "@/components/FileUploadBox";

function AnalysisPage() {
  const handleAnalysisComplete = (result: AnalysisResultResponse) => {
    console.log("Analysis metrics:", {
      printTime: `${result.metrics.print_time_hours.toFixed(1)} hours`,
      material: `${result.metrics.filament_grams.toFixed(1)}g`,
      volume: `${(result.metrics.volume_mm3 / 1000).toFixed(1)} cm³`,
      complexity: result.metrics.complexity_score.toFixed(1),
      supports: result.metrics.supports_required ? "Required" : "Not required",
    });
  };

  return (
    <FileUploadBox
      onAnalysisComplete={handleAnalysisComplete}
      analysisSettings={{
        layer_height: 0.2,
        infill_density: 15,
        infill_pattern: "grid",
        supports: true,
        bed_adhesion: "brim",
        material_type: "PLA",
        nozzle_temperature: 210,
        bed_temperature: 60,
      }}
      autoStartAnalysis={true}
    />
  );
}
```

### Real-time Progress Tracking

```typescript
import { AnalysisProgress } from "@/components/AnalysisProgress";

function ProgressTracker({ jobId }: { jobId: string }) {
  return (
    <AnalysisProgress
      jobId={jobId}
      onComplete={(result) => {
        console.log("Analysis completed:", result);
      }}
      onError={(error) => {
        console.error("Analysis failed:", error);
      }}
    />
  );
}
```

## WebSocket Message Format

### Analysis Update Messages

```typescript
interface AnalysisUpdateMessage {
  type: "analysis_update";
  analysis_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  result?: AnalysisResultResponse;
  error?: string;
  timestamp: string;
}
```

### Example Messages

**Progress Update:**

```json
{
  "type": "analysis_update",
  "analysis_id": "job-123",
  "status": "processing",
  "progress": 75,
  "timestamp": "2023-01-01T00:00:00Z"
}
```

**Completion:**

```json
{
  "type": "analysis_update",
  "analysis_id": "job-123",
  "status": "completed",
  "progress": 100,
  "result": {
    "id": "result-123",
    "file_id": "file-123",
    "settings": {...},
    "metrics": {
      "filament_grams": 25.5,
      "print_time_hours": 2.5,
      "volume_mm3": 15000,
      "complexity_score": 7.2,
      "supports_required": true
    },
    "analyzed_at": "2023-01-01T00:00:00Z"
  },
  "timestamp": "2023-01-01T00:00:00Z"
}
```

## Error Handling

### Error Types

1. **Upload Errors** - File validation, size limits, network issues
2. **Analysis Errors** - Invalid STL files, processing failures
3. **WebSocket Errors** - Connection failures, authentication issues
4. **API Errors** - Server errors, rate limiting

### Error Recovery

- **Automatic Retry** - Failed requests are retried with exponential backoff
- **Fallback Polling** - When WebSocket fails, falls back to HTTP polling
- **User-Friendly Messages** - Technical errors are translated to actionable messages
- **Manual Retry** - Users can manually retry failed operations

## Performance Considerations

### Optimization Features

- **Request Deduplication** - Identical concurrent requests are deduplicated
- **Caching** - Analysis results are cached to avoid redundant requests
- **Progressive Loading** - UI updates progressively as data becomes available
- **Connection Management** - WebSocket connections are managed efficiently

### Best Practices

1. **Use Real-time Updates** - Enable WebSocket updates for better UX
2. **Handle Offline States** - Gracefully handle network disconnections
3. **Provide Feedback** - Always show progress and status to users
4. **Cache Results** - Cache analysis results to improve performance
5. **Error Boundaries** - Use error boundaries to prevent crashes

## Testing

### Unit Tests

The integration includes comprehensive unit tests covering:

- API endpoint integration
- WebSocket message handling
- Error scenarios
- Data formatting
- State management

### Running Tests

```bash
cd apps/frontend
npx vitest run src/test/analysis-integration.test.ts
```

### Test Coverage

- ✅ Analysis request data structures
- ✅ Metric formatting
- ✅ File size formatting
- ✅ API endpoint calls
- ✅ WebSocket message format
- ✅ Analysis completion handling

## Configuration

### Environment Variables

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
```

### Default Settings

```typescript
const defaultAnalysisSettings: PrintSettings = {
  layer_height: 0.2,
  infill_density: 20,
  infill_pattern: "grid",
  supports: true,
  bed_adhesion: "brim",
  material_type: "PLA",
  nozzle_temperature: 210,
  bed_temperature: 60,
};
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Fails**

   - Check authentication token
   - Verify WebSocket URL
   - Check network connectivity

2. **Analysis Doesn't Start**

   - Verify file is uploaded successfully
   - Check file format (must be STL)
   - Ensure user has proper permissions

3. **Progress Updates Not Received**
   - Check WebSocket connection status
   - Verify job ID is correct
   - Check for network issues

### Debug Mode

Enable debug logging in development:

```typescript
const { wsConnected, error } = useFileAnalysis({
  enableRealTimeUpdates: true,
  enableNotifications: process.env.NODE_ENV === "development",
});

console.log("WebSocket connected:", wsConnected);
console.log("Analysis error:", error);
```

## Future Enhancements

### Planned Features

1. **Batch Analysis** - Analyze multiple files simultaneously
2. **Analysis History** - View past analysis results
3. **Custom Settings Presets** - Save and reuse analysis settings
4. **Analysis Comparison** - Compare results from different settings
5. **Export Results** - Export analysis data in various formats

### Performance Improvements

1. **Analysis Caching** - Cache analysis results for identical files
2. **Predictive Analysis** - Pre-analyze common file types
3. **Progressive Results** - Stream partial results as they become available
4. **Background Processing** - Continue analysis in background tabs

## Conclusion

The STL analysis integration provides a robust, real-time analysis experience with comprehensive error handling and performance optimizations. The modular architecture makes it easy to extend and maintain while providing excellent user experience through real-time updates and intuitive interfaces.
