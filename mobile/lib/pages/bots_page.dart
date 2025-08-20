import 'package:blacker/widgets/pulsating_indicator.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_svg/flutter_svg.dart';
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
                  tabs: const [
                    Tab(text: "All Bots"),
                    Tab(text: "Binance"),
                    Tab(text: "ByBit"),
                  ],
                ),
              ),
            ),

            Expanded(
              child: TabBarView(
                children: [
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

                  Obx(() {
                    final activos = controller.bots
                        .where((bot) => bot["enabled"]?.value == true)
                        .toList();
                    if (activos.isEmpty) {
                      return const Center(child: Text("No bots available"));
                    }
                    return _buildBotList(activos, controller);
                  }),

                  Obx(() {
                    final inactivos = controller.bots
                        .where((bot) => bot["enabled"]?.value == false)
                        .toList();
                    if (inactivos.isEmpty) {
                      return const Center(child: Text("No bots available"));
                    }
                    return _buildBotList(inactivos, controller);
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
    final infoLength = bots[0]["info"].length;
    final crossAxisCount = 3;
    final tileHeight = 40.0;
    final rowCount = (infoLength / crossAxisCount).ceil();
    final gridHeight = rowCount * tileHeight;

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: bots.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final bot = bots[index];

        return Card(
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
                    width: 32,
                    height: 32,
                  ),
                  title: Text(
                    bot["name"] ?? "Nombre desconocido",
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  subtitle: Row(
                    children: [
                      Text(
                        bot["description"] ?? "Sin descripción",
                        style: Theme.of(
                          context,
                        ).textTheme.bodyMedium?.copyWith(color: Colors.grey),
                      ),
                      const SizedBox(width: 8),
                      Obx(
                        () => PulsatingIndicator(
                          isActive:
                              bot["live"]?.value ?? false, // este valor cambia
                          size: 5,
                        ),
                      ),
                    ],
                  ),
                  trailing: Obx(
                    () => Switch(
                      value: bot["enabled"]?.value ?? false,
                      onChanged: (value) {
                        controller.updateBotStatus(bot, value);
                      },
                      activeThumbColor: Colors.white,
                      activeTrackColor: Colors.grey.withAlpha(40),
                      inactiveThumbColor: Colors.grey,
                      inactiveTrackColor: Colors.grey.withAlpha(100),
                    ),
                  ),
                ),
                ListTile(
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
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: Colors.green,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  onTap: () => print("${bot["name"]} - PnL presionado"),
                ),
                SizedBox(
                  height: gridHeight,
                  child: GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: crossAxisCount,
                    childAspectRatio: 3 / 1,
                    crossAxisSpacing: 4,
                    mainAxisSpacing: 4,
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
                        onTap: () => print(
                          "${bot["name"]} - ${actions[i]["title"]} presionado",
                        ),
                        child: Align(
                          alignment: alignment,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: crossAlign,
                            children: [
                              Text(
                                actions[i]["title"]!,
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: Colors.grey),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                actions[i]["subtitle"]!,
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(
                                      color:
                                          actions[i]["title"] == "Status" &&
                                                  actions[i]["subtitle"] ==
                                                      "Stopped" ||
                                              actions[i]["subtitle"] == "Error"
                                          ? Colors.red
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
        );
      },
    );
  }
}
