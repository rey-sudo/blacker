import 'package:blacker/controllers/logs_controller.dart';
import 'package:blacker/widgets/image_grid.dart';
import 'package:blacker/widgets/info_card.dart';
import 'package:blacker/widgets/info_grid.dart';
import 'package:blacker/widgets/logs_terminal.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../widgets/pulsating_indicator.dart';
import '../controllers/bots_controller.dart';

class BotPage extends StatelessWidget {
  final String botId;

  const BotPage({super.key, required this.botId});

  @override
  Widget build(BuildContext context) {
    final BotsController controller = Get.find<BotsController>();
    final LogsController logsController = Get.put(LogsController());

    final theme = Theme.of(context);

    logsController.listen(botId);

    final bot = controller.bots.firstWhere(
      (b) => b["id"] == botId,
      orElse: () => <String, dynamic>{},
    );

    if (bot.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text("Bot not found")),
        body: Center(child: Text("Bot not found")),
      );
    }

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          title: Text(
            bot["id"] ?? "Bot",
            style: theme.textTheme.titleMedium,
          ),
          backgroundColor: Colors.white,
          elevation: 0,
          bottom: PreferredSize(
            preferredSize: Size.fromHeight(48.h),
            child: TabBar(
              isScrollable: false,
              labelColor: theme.primaryColor,
              unselectedLabelColor: Colors.grey,
              indicatorColor: theme.primaryColor,
              dividerColor: theme.dividerColor,
              labelStyle: theme.textTheme.bodyMedium,
              tabs: const [
                Tab(text: "Overview"),
                Tab(text: "Logs"),
                Tab(text: "Config"),
              ],
            ),
          ),
        ),
        body: TabBarView(
          children: [
            SingleChildScrollView(
              padding: EdgeInsets.all(16.w),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: 16.h),

                  Row(
                    children: [
                      SvgPicture.asset(
                        'assets/icons/binance.svg',
                        width: 20.w,
                        height: 20.w,
                      ),
                      SizedBox(width: 12.w),

                      Obx(() {
                        final currentBot = controller.bots.firstWhere(
                          (b) => b["id"] == botId,
                          orElse: () => <String, dynamic>{},
                        );
                        return Text(
                          currentBot["symbol"] ?? "Unknown",
                          style: theme.textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.bold),
                        );
                      }),

                      const Spacer(),
                      Obx(() {
                        final currentBot = controller.bots.firstWhere(
                          (b) => b["id"] == botId,
                          orElse: () => <String, dynamic>{},
                        );
                        return Row(
                          children: [
                            PulsatingIndicator(
                              isActive: currentBot["live"] ?? false,
                              size: 10.w,
                            ),
                            SizedBox(width: 6.w),
                            Text(
                              currentBot["live"] == true ? "Live" : "Offline",
                              style: theme.textTheme.bodyMedium
                                  ?.copyWith(
                                    color: currentBot["live"] == true
                                        ? Colors.green
                                        : Colors.red,
                                    fontWeight: FontWeight.w500,
                                  ),
                            ),
                          ],
                        );
                      }),
                    ],
                  ),

                  SizedBox(height: 24.h),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: InfoCard(
                          label: 'PnL (USD)',
                          value: '\$1,250.50',
                          color: Colors.green,
                        ),
                      ),
                      SizedBox(width: 16.w),
                      Expanded(
                        child: Obx(() {
                          final currentBot = controller.bots.firstWhere(
                            (b) => b["id"] == botId,
                            orElse: () => <String, dynamic>{},
                          );
                          return InfoCard(
                            label: 'Iteration',
                            value: "${currentBot["iteration"] ?? 0}",
                            color: Colors.blue,
                          );
                        }),
                      ),
                    ],
                  ),
                  SizedBox(height: 16.h),
                  Divider(color: theme.dividerColor),
                  SizedBox(height: 16.h),

                  Obx(() {
                    final currentBot = controller.bots.firstWhere(
                      (b) => b["id"] == botId,
                      orElse: () => <String, dynamic>{},
                    );

                    if (currentBot["info"] == null ||
                        currentBot["info"].isEmpty) {
                      return const SizedBox.shrink();
                    }

                    return InfoGrid(
                      info: currentBot["info"],
                      crossAxisCount: 3,
                      getSubtitleColor: _getSubtitleColor,
                    );
                  }),

                  SizedBox(height: 16.h),

                  if (bot["description"] != null &&
                      bot["description"].isNotEmpty) ...[
                    Divider(color: theme.dividerColor),
                    SizedBox(height: 16.h),
                    Text(
                      "Description",
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 8.h),
                    Text(
                      bot["description"],
                      style: theme.textTheme.bodyMedium,
                    ),
                    SizedBox(height: 16.h),
                  ],

                  Obx(() {
                    final currentBot = controller.bots.firstWhere(
                      (b) => b["id"] == botId,
                      orElse: () => <String, dynamic>{},
                    );

                    if (currentBot["images"] == null ||
                        currentBot["images"].isEmpty) {
                      return SizedBox.shrink();
                    }

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Divider(color: theme.dividerColor),
                        SizedBox(height: 16.h),
                        Text(
                          "Images",
                          style: theme.textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),

                        SizedBox(height: 16.h),

                        SizedBox(
                          height: 1000.h,
                          child: ImageGrid(
                            images: List<String>.from(currentBot["images"]),
                            scrollable: false,
                          ),
                        ),
                      ],
                    );
                  }),
                ],
              ),
            ),

            Obx(() {
              return LogsTerminal(logs: logsController.events.toList());
            }),

            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.settings, size: 48.w, color: Colors.grey),
                  SizedBox(height: 16.h),
                  Text(
                    "Configuration details...",
                    style: Theme.of(
                      context,
                    ).textTheme.bodyMedium?.copyWith(color: Colors.grey),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
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
