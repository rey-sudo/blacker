import 'package:blacker/widgets/image_grid.dart';
import 'package:blacker/widgets/info_card.dart';
import 'package:blacker/widgets/info_grid.dart';
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
            style: Theme.of(context).textTheme.titleMedium,
          ),
          backgroundColor: Colors.white,
          elevation: 0,
          bottom: PreferredSize(
            preferredSize: Size.fromHeight(48.h),
            child: TabBar(
              isScrollable: false,
              labelColor: Theme.of(context).primaryColor,
              unselectedLabelColor: Colors.grey,
              indicatorColor: Theme.of(context).primaryColor,
              dividerColor: Theme.of(context).dividerColor,
              labelStyle: Theme.of(context).textTheme.bodyMedium,
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
                  SizedBox(height: 12.h),

                  Row(
                    children: [
                      Obx(() {
                        final currentBot = controller.bots.firstWhere(
                          (b) => b["id"] == botId,
                          orElse: () => <String, dynamic>{},
                        );
                        return Text(
                          currentBot["symbol"] ?? "Unknown",
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.bold),
                        );
                      }),
                      SizedBox(width: 12.w),
                      SvgPicture.asset(
                        'assets/icons/binance.svg',
                        width: 20.w,
                        height: 20.w,
                      ),
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
                              style: Theme.of(context).textTheme.bodyMedium
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
                    children: [
                      Expanded(
                        child: InfoCard(
                          label: 'PnL (USD)',
                          value: '\$1,250.50',
                          color: Colors.green,
                        ),
                      ),
                      SizedBox(width: 12.w),
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

                  SizedBox(height: 24.h),

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

                  SizedBox(height: 24.h),

                  if (bot["description"] != null &&
                      bot["description"].isNotEmpty) ...[
                    Divider(color: Theme.of(context).dividerColor),
                    SizedBox(height: 16.h),
                    Text(
                      "Description",
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 8.h),
                    Text(
                      bot["description"],
                      style: Theme.of(context).textTheme.bodyMedium,
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
                        Divider(color: Theme.of(context).dividerColor),
                        SizedBox(height: 16.h),
                        Text(
                          "Images",
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        SizedBox(height: 12.h),
                        ImageGrid(
                          images: List<String>.from(currentBot["images"]),
                        ),
                      ],
                    );
                  }),
                ],
              ),
            ),

            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.history, size: 48.w, color: Colors.grey),
                  SizedBox(height: 16.h),
                  Text(
                    "Trades history...",
                    style: Theme.of(
                      context,
                    ).textTheme.bodyMedium?.copyWith(color: Colors.grey),
                  ),
                ],
              ),
            ),

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


Color _getSubtitleColor(String title, String subtitle) {
  if (title == "Status") {
    if (subtitle == "stopped" || subtitle == "error") {
      return Colors.red;
    }
    if (subtitle == "started") {
      return Colors.green;
    }
  }
  return Colors.black;
}