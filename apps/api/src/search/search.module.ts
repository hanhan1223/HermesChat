import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchProvidersService } from './search-providers.service';
import { SearchBillingService } from './search-billing.service';
import { TavilyClient } from './tavily.client';
import { PubMedClient } from './pubmed.client';
import { ScholarClient } from './scholar.client';
import { GoogleSearchClient } from './google-search.client';

@Module({
  imports: [PrismaModule],
  providers: [
    SearchProvidersService,
    SearchBillingService,
    TavilyClient,
    PubMedClient,
    ScholarClient,
    GoogleSearchClient,
  ],
  exports: [
    SearchProvidersService,
    SearchBillingService,
    TavilyClient,
    PubMedClient,
    ScholarClient,
    GoogleSearchClient,
  ],
})
export class SearchModule {}
