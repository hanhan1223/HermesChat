-- HermesChat 数据库初始化脚本
-- 创建默认管理员账号和基础套餐

-- 默认密码: admin123 (BCrypt 加密)
-- 注意：生产环境必须修改默认密码

INSERT INTO users (id, email, name, password_hash, role, status, credits, total_token_used, created_at, updated_at)
VALUES (
    'admin00000000000000000000000001',
    'admin@hermes.chat',
    '超级管理员',
    '',
    'SUPER_ADMIN',
    'ACTIVE',
    999999,
    0,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 默认订阅套餐
INSERT INTO subscription_plans (id, code, name, description, monthly_credits, daily_token_limit, monthly_token_limit, max_conversations, max_skills, max_mcp_servers, price_monthly, price_yearly, is_active, sort_order, created_at)
VALUES 
    ('plan00000000000000000000000001', 'free', '免费版', '适合个人用户体验', 1000, 10000, 100000, 10, 3, 1, 0, 0, true, 1, NOW()),
    ('plan00000000000000000000000002', 'pro', '专业版', '适合重度用户和专业人士', 10000, 100000, 1000000, 100, 20, 5, 69, 690, true, 2, NOW()),
    ('plan00000000000000000000000003', 'enterprise', '企业版', '适合团队和企业用户', 100000, 1000000, 10000000, 9999, 100, 20, 299, 2990, true, 3, NOW())
ON CONFLICT (id) DO NOTHING;

-- 默认模型配置（示例，API Key 需管理后台配置）
INSERT INTO models (id, name, provider, model_id, api_key, max_tokens, supports_vision, supports_tools, cost_per_input_token, cost_per_output_token, enabled, priority, available_plans, created_at)
VALUES
    ('model00000000000000000000000001', 'GPT-4o', 'openai', 'gpt-4o', '', 128000, true, true, 0.0000025, 0.00001, false, 100, '["pro","enterprise"]', NOW()),
    ('model00000000000000000000000002', 'Claude 3.5 Sonnet', 'anthropic', 'claude-3-5-sonnet-20241022', '', 200000, true, true, 0.000003, 0.000015, false, 90, '["pro","enterprise"]', NOW()),
    ('model00000000000000000000000003', 'Gemini 1.5 Pro', 'google', 'gemini-1.5-pro', '', 1000000, true, true, 0.00000125, 0.000005, false, 80, '["free","pro","enterprise"]', NOW())
ON CONFLICT (id) DO NOTHING;