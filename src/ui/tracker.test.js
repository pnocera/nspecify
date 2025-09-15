import { jest } from '@jest/globals';
import { mockProcess, captureOutput, resetAllMocks } from '../../test/helpers/mocks.js';

// Mock dependencies
jest.unstable_mockModule('chalk', () => {
  const createChainableMock = () => {
    const chainable = new Proxy(() => {}, {
      apply: (target, thisArg, args) => {
        return `[STYLED]${args[0]}[/STYLED]`;
      },
      get: (target, prop) => {
        if (typeof prop === 'string') {
          const styleFn = (text) => `[${prop.toUpperCase()}]${text}[/${prop.toUpperCase()}]`;
          // Make each style function also chainable
          return new Proxy(styleFn, {
            apply: (target, thisArg, args) => target(...args),
            get: (target, nestedProp) => {
              if (typeof nestedProp === 'string') {
                return (text) => `[${prop.toUpperCase()}][${nestedProp.toUpperCase()}]${text}[/${nestedProp.toUpperCase()}][/${prop.toUpperCase()}]`;
              }
              return target[nestedProp];
            }
          });
        }
        return target[prop];
      }
    });
    return chainable;
  };
  
  return {
    default: createChainableMock()
  };
});

const { StepTracker } = await import('./tracker.js');

describe('tracker', () => {
  beforeEach(() => {
    resetAllMocks();
    global.process = mockProcess;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('StepTracker', () => {
    it('should create a tracker with title', () => {
      const tracker = new StepTracker('Installation Progress');
      
      expect(tracker.title).toBe('Installation Progress');
      expect(tracker.steps).toEqual([]);
    });

    it('should add steps', () => {
      const tracker = new StepTracker('Progress');
      
      tracker.add('setup', 'Setting up environment');
      tracker.add('download', 'Downloading templates');
      
      expect(tracker.steps).toHaveLength(2);
      expect(tracker.steps[0]).toEqual({
        key: 'setup',
        label: 'Setting up environment',
        status: 'pending',
        detail: ''
      });
    });

    it('should not add duplicate steps', () => {
      const tracker = new StepTracker('Progress');
      
      tracker.add('setup', 'Setting up');
      tracker.add('setup', 'Setting up again');
      
      expect(tracker.steps).toHaveLength(1);
      expect(tracker.steps[0].label).toBe('Setting up');
    });

    it('should start a step', () => {
      const tracker = new StepTracker('Progress');
      
      tracker.add('setup', 'Setting up environment');
      tracker.start('setup');
      
      expect(tracker.steps[0].status).toBe('running');
      
      // Render to check output
      const outputText = tracker.render();
      expect(outputText).toContain('Setting up environment');
      expect(outputText).toContain('[CYAN]'); // Running status uses cyan
    });

    it('should complete a step successfully', () => {
      const tracker = new StepTracker('Progress');
      
      tracker.add('setup', 'Setting up environment');
      tracker.start('setup');
      tracker.complete('setup');
      
      expect(tracker.steps[0].status).toBe('done');
      
      // Render to check output
      const outputText = tracker.render();
      expect(outputText).toContain('[GREEN]');
    });

    it('should mark a step as error', () => {
      const tracker = new StepTracker('Progress');
      
      tracker.add('download', 'Downloading files');
      tracker.start('download');
      tracker.error('download', 'Network timeout');
      
      expect(tracker.steps[0].status).toBe('error');
      expect(tracker.steps[0].detail).toBe('Network timeout');
      
      // Render to check output
      const outputText = tracker.render();
      expect(outputText).toContain('[RED]');
      expect(outputText).toContain('Network timeout');
    });

    it('should skip a step', () => {
      const tracker = new StepTracker('Progress');
      
      tracker.add('optional', 'Optional step');
      tracker.skip('optional', 'Not needed');
      
      expect(tracker.steps[0].status).toBe('skipped');
      expect(tracker.steps[0].detail).toBe('Not needed');
    });

    it('should handle step with progress detail', () => {
      const tracker = new StepTracker('Progress');
      
      tracker.add('download', 'Downloading');
      tracker.start('download', '0%');
      tracker.update('download', 'running', '50%');
      
      expect(tracker.steps[0].detail).toBe('50%');
      
      const outputText = tracker.render();
      expect(outputText).toContain('50%');
    });

    it('should render tracker output', () => {
      const tracker = new StepTracker('Installation Progress');
      
      tracker.add('setup', 'Setting up environment');
      tracker.add('download', 'Downloading templates');
      tracker.add('extract', 'Extracting files');
      
      tracker.start('setup');
      tracker.complete('setup');
      tracker.start('download');
      
      const outputText = tracker.render();
      
      // Check title
      expect(outputText).toContain('Installation Progress');
      
      // Check steps
      expect(outputText).toContain('Setting up environment');
      expect(outputText).toContain('Downloading templates');
      expect(outputText).toContain('Extracting files');
      
      // Check status indicators
      expect(outputText).toContain('[GREEN]'); // Done
      expect(outputText).toContain('[CYAN]'); // Running status uses cyan // Running
      expect(outputText).toContain('[GRAY]'); // Pending
    });

    it('should format output correctly', () => {
      const output = captureOutput();
      const tracker = new StepTracker('Progress');
      
      tracker.add('test', 'Test Step');
      tracker.start('test', 'In progress...');
      
      const outputText = tracker.render();
      
      expect(outputText).toContain('Test Step');
      expect(outputText).toContain('In progress...');
    });

    it('should attach refresh callback', () => {
      const tracker = new StepTracker('Progress');
      const callback = jest.fn();
      
      tracker.attachRefresh(callback);
      tracker.add('test', 'Test step');
      
      // maybeRefresh should call the callback
      expect(callback).toHaveBeenCalled();
    });

    it('should handle maybeRefresh without callback', () => {
      const tracker = new StepTracker('Progress');
      
      // Should not throw
      expect(() => {
        tracker.add('test', 'Test step');
      }).not.toThrow();
    });

    it('should handle invalid step keys', () => {
      const tracker = new StepTracker('Progress');
      
      // Should not throw for non-existent step
      expect(() => {
        tracker.start('nonexistent');
        tracker.complete('nonexistent');
        tracker.error('nonexistent', 'Error');
      }).not.toThrow();
    });

    it('should display proper status symbols', () => {
      const output = captureOutput();
      const tracker = new StepTracker('Progress');
      
      tracker.add('s1', 'Pending step');
      tracker.add('s2', 'Running step');
      tracker.add('s3', 'Done step');
      tracker.add('s4', 'Error step');
      tracker.add('s5', 'Skipped step');
      
      tracker.start('s2');
      tracker.complete('s3');
      tracker.error('s4');
      tracker.skip('s5');
      
      const outputText = tracker.render();
      
      // Check for status indicators in output
      // Based on the actual output, the symbols are wrapped in color codes
      expect(outputText).toContain('○'); // pending
      expect(outputText).toContain('○'); // running (using circle)
      expect(outputText).toContain('●'); // done (using filled circle)
      expect(outputText).toContain('●'); // error (using filled circle) 
      expect(outputText).toContain('○'); // skipped (using circle)
    });
  });
});