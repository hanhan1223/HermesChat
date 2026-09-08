import { render, screen, fireEvent } from '@testing-library/react';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import { ToolCallCard } from '@/components/chat/ToolCallCard';

/**
 * 聊天组件单元测试
 */
describe('Chat Components', () => {
  describe('ThinkingBlock', () => {
    it('renders thinking block with toggle', () => {
      render(<ThinkingBlock content="这是思考过程" />);
      
      expect(screen.getByText('思考过程')).toBeInTheDocument();
    });

    it('toggles content visibility', () => {
      render(<ThinkingBlock content="这是思考内容" />);
      
      // 默认折叠
      expect(screen.queryByText('这是思考内容')).not.toBeInTheDocument();
      
      // 点击展开
      fireEvent.click(screen.getByText('思考过程'));
      expect(screen.getByText('这是思考内容')).toBeInTheDocument();
    });
  });

  describe('ToolCallCard', () => {
    const mockToolCall = {
      id: 'tc_1',
      name: 'web_search',
      arguments: { query: 'test' },
      status: 'success' as const,
      result: { data: 'result' },
    };

    it('renders tool call card', () => {
      render(<ToolCallCard toolCall={mockToolCall} />);
      
      expect(screen.getByText('web_search')).toBeInTheDocument();
      expect(screen.getByText('成功')).toBeInTheDocument();
    });

    it('shows error status', () => {
      const errorCall = {
        ...mockToolCall,
        status: 'error' as const,
        error: 'Something went wrong',
      };
      
      render(<ToolCallCard toolCall={errorCall} />);
      expect(screen.getByText('失败')).toBeInTheDocument();
    });

    it('expands to show details', () => {
      render(<ToolCallCard toolCall={mockToolCall} />);
      
      fireEvent.click(screen.getByText('web_search'));
      expect(screen.getByText('参数')).toBeInTheDocument();
      expect(screen.getByText('结果')).toBeInTheDocument();
    });
  });
});