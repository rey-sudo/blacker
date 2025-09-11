import 'package:blacker/pages/bot_page.dart';
import 'package:blacker/widgets/info_grid.dart';
import 'package:blacker/widgets/loading_indicator.dart';
import 'package:blacker/widgets/pulsating_indicator.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../controllers/bots_controller.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class BotsPage extends StatelessWidget {
  const BotsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final BotsController controller = Get.put(BotsController());
    final theme = Theme.of(context);

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: theme.scaffoldBackgroundColor,
        body: Column(
          children: [
            SafeArea(
              child: Container(
                width: double.infinity,
                padding: EdgeInsets.zero,
                child: TabBar(
                  isScrollable: false,
                  labelColor: theme.colorScheme.primary,
                  unselectedLabelColor: Colors.grey,
                  indicatorColor: theme.colorScheme.primary,
                  dividerColor: theme.dividerColor,
                  labelStyle: theme.textTheme.bodyMedium,
                  tabs: const [
                    Tab(text: "All"),
                    Tab(text: "Executed"),
                    Tab(text: "Finished"),
                  ],
                ),
              ),
            ),

            Expanded(
              child: TabBarView(
                children: [
                  Obx(() {
                    if (controller.isLoading.value) {
                      return const LoadingIndicator();
                    }

                    if (controller.bots.isEmpty) {
                      return Center(
                        child: Text(
                          "No bots available",
                          style: Theme.of(
                            context,
                          ).textTheme.bodySmall?.copyWith(color: Colors.black),
                        ),
                      );
                    }
                    return _buildBotList(controller.bots, controller);
                  }),

                  Obx(() {
                    if (controller.isLoading.value) {
                      return const LoadingIndicator();
                    }

                    final executedBots = controller.bots
                        .where((bot) => bot["status"] == "executed")
                        .toList();
                    if (executedBots.isEmpty) {
                      return const Center(
                        child: Text("No executed bots available"),
                      );
                    }
                    return _buildBotList(executedBots, controller);
                  }),

                  Obx(() {
                    if (controller.isLoading.value) {
                      return const LoadingIndicator();
                    }

                    final stoppedBots = controller.bots
                        .where((bot) => bot["live"] == false)
                        .toList();
                    if (stoppedBots.isEmpty) {
                      return const Center(
                        child: Text("No stopped bots available"),
                      );
                    }
                    return _buildBotList(stoppedBots, controller);
                  }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBotList(List bots, BotsController controller) {
    if (bots.isEmpty) return const Center(child: Text("No bots available"));

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: bots.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final bot = bots[index];

        final theme = Theme.of(context);

        return GestureDetector(
          onTap: () => Get.to(() => BotPage(botId: bot["id"])),
          child: Card(
            elevation: 0,
            child: Container(
              decoration: BoxDecoration(
                color: theme.cardTheme.color,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: theme.dividerColor,
                  width: 1,
                ),
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      SvgPicture.asset(
                        'assets/icons/binance.svg',
                        width: 35,
                        height: 35,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              bot["symbol"] ?? "Nombre desconocido",
                              style: theme.textTheme.titleMedium
                                  ?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                            Row(
                              children: [
                                Text(
                                  bot["id"] ?? "Sin descripción",
                                  style: theme.textTheme.bodyMedium
                                      ?.copyWith(color: Colors.grey),
                                ),
                                const SizedBox(width: 8),
                                PulsatingIndicator(
                                  isActive: bot["live"] ?? false,
                                  size: 6,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      Transform.translate(
                        offset: const Offset(4, 0),
                        child: Switch(
                          materialTapTargetSize:
                              MaterialTapTargetSize.shrinkWrap,
                          value: bot["live"] ?? false,
                          onChanged: (value) {
                            print('Toggle bot ${bot["id"]} to $value');
                          },
                          activeThumbColor: Colors.white,
                          activeTrackColor: Colors.grey.withAlpha(40),
                          inactiveThumbColor: Colors.grey,
                          inactiveTrackColor: Colors.grey.withAlpha(100),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: ListTile(
                          dense: false,
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            'PnL (USD)',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurface,
                            ),
                          ),
                          subtitle: Text(
                            '\$1,250.50',
                            style: theme.textTheme.titleLarge?.copyWith(
                              color: theme.colorScheme.tertiary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: ListTile(
                          dense: false,
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            'Iteration',
                            textAlign: TextAlign.right,
                            style: theme.textTheme.bodySmall
                                ?.copyWith(color: theme.colorScheme.onSurface),
                          ),
                          subtitle: Text(
                            '${bot["iteration"] ?? 0}',
                            textAlign: TextAlign.right,
                            style: theme.textTheme.titleMedium
                                ?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  InfoGrid(
                    info: bot["info"],
                    crossAxisCount: 3,
                    getSubtitleColor: _getSubtitleColor,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

Color _getSubtitleColor(String title, String subtitle, ThemeData theme) {
  if (title == "Status") {
    if (subtitle == "stopped" || subtitle == "error") {
      return Colors.red;
    }
    if (subtitle == "started") {
      return Colors.green;
    }
  }
  return theme.colorScheme.surface;
}
