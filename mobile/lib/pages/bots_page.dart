import 'package:blacker/pages/bot_page.dart';
import 'package:blacker/widgets/pulsating_indicator.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../controllers/bots_controller.dart';

class BotsPage extends StatelessWidget {
  const BotsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final BotsController controller = Get.put(BotsController());

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: Colors.white,
        body: Column(
          children: [
            SafeArea(
              child: Container(
                width: double.infinity,
                padding: EdgeInsets.zero,
                child: TabBar(
                  isScrollable: false,
                  labelColor: Colors.blue,
                  unselectedLabelColor: Colors.grey,
                  indicatorColor: Colors.blue,
                  dividerColor: Theme.of(context).dividerColor,
                  labelStyle: Theme.of(context).textTheme.bodyMedium,
                  tabs: const [
                    Tab(text: "All Bots"),
                    Tab(text: "Live"),
                    Tab(text: "Stopped"),
                  ],
                ),
              ),
            ),

            Expanded(
              child: TabBarView(
                children: [
                  // All Bots
                  Obx(() {
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

                  // Live Bots
                  Obx(() {
                    final liveBots = controller.bots
                        .where((bot) => bot["live"] == true)
                        .toList();
                    if (liveBots.isEmpty) {
                      return const Center(
                        child: Text("No live bots available"),
                      );
                    }
                    return _buildBotList(liveBots, controller);
                  }),

                  // Stopped Bots
                  Obx(() {
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

    final infoLength = bots[0]["info"]?.length ?? 0;
    final crossAxisCount = 3;

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: bots.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final bot = bots[index];

        return GestureDetector(
          onTap: () => Get.to(() => BotPage(bot: bot)),
          child: Card(
            elevation: 0,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Theme.of(context).dividerColor,
                  width: 1,
                ),
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: SvgPicture.asset(
                      'assets/icons/binance.svg',
                      width: 35,
                      height: 35,
                    ),
                    title: Text(
                      bot["symbol"] ?? "Nombre desconocido",
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Colors.black,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    subtitle: Row(
                      children: [
                        Text(
                          bot["id"] ?? "Sin descripción",
                          style: Theme.of(
                            context,
                          ).textTheme.bodyMedium?.copyWith(color: Colors.grey),
                        ),
                        const SizedBox(width: 8),
                        PulsatingIndicator(
                          isActive: bot["live"] ?? false,
                          size: 6,
                        ),
                      ],
                    ),
                    trailing: Switch(
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
                  Row(
                    children: [
                      Expanded(
                        child: ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            'PnL (USD)',
                            style: Theme.of(
                              context,
                            ).textTheme.bodySmall?.copyWith(color: Colors.grey),
                          ),
                          subtitle: Text(
                            '\$1,250.50',
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(
                                  color: Colors.green,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            'Iteration',
                            textAlign: TextAlign.right,
                            style: Theme.of(
                              context,
                            ).textTheme.bodySmall?.copyWith(color: Colors.grey),
                          ),
                          subtitle: Text(
                            '${bot["iteration"] ?? 0}',
                            textAlign: TextAlign.right,
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(
                                  color: Colors.blue,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                        ),
                      ),
                    ],
                  ),
             
                  if (bot["info"] != null && bot["info"].isNotEmpty)
                    SizedBox(
                      child: GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: crossAxisCount,
                        childAspectRatio: 3 / 1,
                        crossAxisSpacing: 4.w,
                        mainAxisSpacing: 4.h,
                        children: List.generate(infoLength, (i) {
                          int colPosition = i % crossAxisCount;

                          Alignment alignment;
                          CrossAxisAlignment crossAlign;

                          switch (colPosition) {
                            case 0:
                            case 1:
                              alignment = Alignment.centerLeft;
                              crossAlign = CrossAxisAlignment.start;
                              break;
                            case 2:
                              alignment = Alignment.centerRight;
                              crossAlign = CrossAxisAlignment.end;
                              break;
                            default:
                              alignment = Alignment.centerLeft;
                              crossAlign = CrossAxisAlignment.start;
                          }

                          final actions = bot["info"];

                          return InkWell(
                            child: Align(
                              alignment: alignment,
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: crossAlign,
                                children: [
                                  Text(
                                    actions[i]["title"] ?? "",
                                    style: Theme.of(context).textTheme.bodySmall
                                        ?.copyWith(color: Colors.grey),
                                  ),
                                  SizedBox(height: 2.h),
                                  Text(
                                    actions[i]["subtitle"] ?? "",
                                    style: Theme.of(context).textTheme.bodySmall
                                        ?.copyWith(
                                          color:
                                              actions[i]["title"] == "Status" &&
                                                  (actions[i]["subtitle"] ==
                                                          "stopped" ||
                                                      actions[i]["subtitle"] ==
                                                          "error")
                                              ? Colors.red
                                              : actions[i]["title"] ==
                                                        "Status" &&
                                                    actions[i]["subtitle"] ==
                                                        "started"
                                              ? Colors.green
                                              : Colors.black,
                                        ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                      ),
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
