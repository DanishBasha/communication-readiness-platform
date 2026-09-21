import { ModelFactory } from '../src/adapters/models/ModelFactory';
import { MockModelAdapter } from '../src/adapters/models/MockModelAdapter';

describe('Model Adapter Layer', () => {
  it('should instantiate MockModelAdapter when configured as mock', () => {
    const adapter = ModelFactory.getModelAdapter('mock');
    expect(adapter.providerName).toBe('mock');
  });

  it('should generate completion using MockModelAdapter', async () => {
    const adapter = new MockModelAdapter();
    const reply = await adapter.generateText('Tell me an interview question about Java');
    expect(reply).toBeTruthy();
    expect(typeof reply).toBe('string');
  });

  it('should generate structured JSON for evaluation', async () => {
    const adapter = new MockModelAdapter();
    const result = await adapter.generateStructured<any>(
      'Evaluate student answer',
      '{ "technicalScore": number, "communicationScore": number }'
    );
    expect(result.technicalScore).toBeGreaterThan(0);
    expect(result.communicationScore).toBeGreaterThan(0);
  });

  it('should generate structured output for Suggestion System (2-Agent pattern)', async () => {
    const adapter = new MockModelAdapter();
    const result = await adapter.generateStructured<any>(
      'Student drafted an answer',
      '{ "technicalTerminology": [], "communicationSuggestions": [] }'
    );
    expect(Array.isArray(result.technicalTerminology)).toBe(true);
    expect(result.technicalTerminology.length).toBeGreaterThan(0);
    expect(Array.isArray(result.communicationSuggestions)).toBe(true);
  });
});
