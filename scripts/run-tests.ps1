# HermesChat 自动化测试脚本
# 运行所有测试（后端 + 前端 + 管理后台）

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  HermesChat 自动化测试" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 1. 后端单元测试
Write-Host "
[1/4] 运行 NestJS 后端单元测试..." -ForegroundColor Yellow
cd apps/api
npx jest --passWithNoTests --coverage
if ( -ne 0) { Write-Host "后端单元测试失败!" -ForegroundColor Red }
cd ../..

# 2. 后端 E2E 测试
Write-Host "
[2/4] 运行 NestJS E2E 测试..." -ForegroundColor Yellow
cd apps/api
npx jest --config test/jest-e2e.json --passWithNoTests
if ( -ne 0) { Write-Host "E2E 测试失败!" -ForegroundColor Red }
cd ../..

# 3. 前端测试
Write-Host "
[3/4] 运行 Next.js 前端测试..." -ForegroundColor Yellow
cd apps/web
npx jest --passWithNoTests --coverage
if ( -ne 0) { Write-Host "前端测试失败!" -ForegroundColor Red }
cd ../..

# 4. 管理后台测试
Write-Host "
[4/4] 运行 Spring Boot 管理后台测试..." -ForegroundColor Yellow
cd hermes-admin
mvn test -q
if ( -ne 0) { Write-Host "管理后台测试失败!" -ForegroundColor Red }
cd ..

Write-Host "
=====================================" -ForegroundColor Cyan
Write-Host "  测试完成!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan