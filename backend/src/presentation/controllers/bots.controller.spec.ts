import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BotsController } from './bots.controller';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';
import { TelegramBotService } from '../../application/telegram/telegram-bot.service';
import { DiscordBotService } from '../../application/discord/discord-bot.service';
import { DiscordPanelService } from '../../application/discord/discord-panel.service';

describe('BotsController', () => {
  let controller: BotsController;
  let botConfigRepo: BotConfigRepository;
  let discordPanelService: DiscordPanelService;

  const mockBotConfigRepo = {
    findAll: jest.fn(),
    findByPlatform: jest.fn(),
    upsertByPlatform: jest.fn(),
  };

  const mockTelegramBotService = {
    startBot: jest.fn(),
  };

  const mockDiscordBotService = {
    startBot: jest.fn(),
  };

  const mockDiscordPanelService = {
    syncPanels: jest.fn().mockImplementation((panels) => Promise.resolve(panels)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BotsController],
      providers: [
        {
          provide: BotConfigRepository,
          useValue: mockBotConfigRepo,
        },
        {
          provide: TelegramBotService,
          useValue: mockTelegramBotService,
        },
        {
          provide: DiscordBotService,
          useValue: mockDiscordBotService,
        },
        {
          provide: DiscordPanelService,
          useValue: mockDiscordPanelService,
        },
      ],
    }).compile();

    controller = module.get<BotsController>(BotsController);
    botConfigRepo = module.get<BotConfigRepository>(BotConfigRepository);
    discordPanelService = module.get<DiscordPanelService>(DiscordPanelService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve rejeitar atualizacao de fluxos do telegram sem o comando /start', async () => {
    await expect(
      controller.updateByPlatform('telegram', {
        flows: [
          { trigger: '/fluxo1' },
          { trigger: '/fluxo2' },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve aceitar atualizacao de fluxos do telegram contendo o comando /start', async () => {
    mockBotConfigRepo.upsertByPlatform.mockResolvedValue({ success: true });

    const res = await controller.updateByPlatform('telegram', {
      flows: [
        { trigger: '/start' },
        { trigger: '/fluxo1' },
      ],
    });

    expect(res).toBeDefined();
    expect(mockBotConfigRepo.upsertByPlatform).toHaveBeenCalled();
  });

  it('deve acionar syncPanels quando atualizar configuracao do discord com paineis', async () => {
    mockBotConfigRepo.upsertByPlatform.mockResolvedValue({ success: true });
    const panels = [{ id: 'p1', channelId: 'c1', productIds: ['prod1'], isActive: true }];

    const res = await controller.updateByPlatform('discord', {
      discordPanels: panels,
    });

    expect(res).toBeDefined();
    expect(discordPanelService.syncPanels).toHaveBeenCalledWith(panels);
    expect(mockBotConfigRepo.upsertByPlatform).toHaveBeenCalled();
  });
});
