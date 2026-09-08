import { Test, TestingModule } from '@nestjs/testing';
import { ToolRegistry } from '../src/agent/tool.registry';
import { Tool } from '../src/agent/tool.interface';

/**
 * 工具注册表单元测试
 */
describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ToolRegistry],
    }).compile();
    registry = module.get<ToolRegistry>(ToolRegistry);
  });

  it('should register a tool', () => {
    const mockTool: Tool = {
      name: 'test_tool',
      description: 'A test tool',
      parameters: { type: 'object', properties: {} },
      execute: jest.fn(),
    };

    registry.register(mockTool);
    expect(registry.get('test_tool')).toBe(mockTool);
  });

  it('should return undefined for non-existent tool', () => {
    expect(registry.get('non_existent')).toBeUndefined();
  });

  it('should get all tool names', () => {
    const tool1: Tool = { name: 'tool1', description: '', parameters: {}, execute: jest.fn() };
    const tool2: Tool = { name: 'tool2', description: '', parameters: {}, execute: jest.fn() };
    registry.registerAll([tool1, tool2]);

    const names = registry.getAllNames();
    expect(names).toContain('tool1');
    expect(names).toContain('tool2');
  });

  it('should get tool definitions', () => {
    const tool: Tool = {
      name: 'search',
      description: 'Search the web',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
      },
      execute: jest.fn(),
    };
    registry.register(tool);

    const definitions = registry.getToolDefinitions();
    expect(definitions.length).toBeGreaterThan(0);
    expect(definitions[0].function.name).toBe('search');
  });

  it('should get specific tool definitions', () => {
    const tool1: Tool = { name: 'tool1', description: '', parameters: {}, execute: jest.fn() };
    const tool2: Tool = { name: 'tool2', description: '', parameters: {}, execute: jest.fn() };
    registry.registerAll([tool1, tool2]);

    const definitions = registry.getToolDefinitions(['tool1']);
    expect(definitions.length).toBe(1);
    expect(definitions[0].function.name).toBe('tool1');
  });
});