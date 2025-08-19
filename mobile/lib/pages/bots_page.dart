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
      length: 3, // Número de pestañas
      child: Scaffold(
        backgroundColor: Colors.white,
        body: Column(
          children: [
            const SafeArea(
              child: TabBar(
                labelColor: Colors.blue,
                unselectedLabelColor: Colors.grey,
                indicatorColor: Colors.blue,
                tabs: [
                  Tab(text: "All Bots"),
                  Tab(text: "Binance"),
                  Tab(text: "Bybit"),
                ],
              ),
            ),
            Expanded(
              child: TabBarView(
                children: [
                  // 🔹 TAB 1 → Todos los bots
                  Obx(() {
                    if (controller.bots.isEmpty) {
                      return const Center(
                        child: Text(
                          "No hay bots disponibles",
                          style: TextStyle(fontSize: 18, color: Colors.grey),
                        ),
                      );
                    }
                    return _buildBotList(controller.bots, controller);
                  }),

                  // 🔹 TAB 2 → Solo bots activos
                  Obx(() {
                    final activos = controller.bots
                        .where((bot) => bot["enabled"]?.value == true)
                        .toList();
                    if (activos.isEmpty) {
                      return const Center(child: Text("No hay bots activos"));
                    }
                    return _buildBotList(activos, controller);
                  }),

                  // 🔹 TAB 3 → Solo bots inactivos
                  Obx(() {
                    final inactivos = controller.bots
                        .where((bot) => bot["enabled"]?.value == false)
                        .toList();
                    if (inactivos.isEmpty) {
                      return const Center(child: Text("No hay bots inactivos"));
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
    final actions = [
      {"title": "Runtime", "subtitle": "24h 5m 16s"},
      {"title": "Info", "subtitle": "Detalles"},
      {"title": "Config", "subtitle": "Ajustes"},
      {"title": "Stats", "subtitle": "Estadísticas"},
      {"title": "Help", "subtitle": "Ayuda"},
      {"title": "Share", "subtitle": "Compartir"},
      {"title": "Rate", "subtitle": "Calificar"},
      {"title": "Report", "subtitle": "Reportar"},
      {"title": "More", "subtitle": "Más opciones"},
    ];

    final crossAxisCount = 3;
    final tileHeight = 40.0;
    final rowCount = (actions.length / crossAxisCount).ceil();
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
              border: Border.all(color: Colors.grey.withAlpha(50), width: 1),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ListTile(
                  dense: true,
                  visualDensity: const VisualDensity(vertical: -4),
                  contentPadding: EdgeInsets.zero,
                  leading: SvgPicture.asset(
                    'assets/icons/binance.svg',
                    width: 32,
                    height: 32,
                  ),
                  title: Text(
                    bot["name"] ?? "Nombre desconocido",
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  subtitle: Text(
                    bot["description"] ?? "Sin descripción",
                    style: const TextStyle(fontSize: 14, color: Colors.grey),
                  ),
                  trailing: Obx(
                    () => Switch(
                      value: bot["enabled"]?.value ?? false,
                      onChanged: (value) {
                        controller.updateBotStatus(bot, value);
                      },
                      activeThumbColor: Colors.blue,
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
                    'PnL',
                    style: Theme.of(
                      context,
                    ).textTheme.bodySmall?.copyWith(color: Colors.grey),
                  ),
                  subtitle: Text(
                    '\$1,250.50',
                    style: Theme.of(
                      context,
                    ).textTheme.titleMedium?.copyWith(color: Colors.green, fontWeight: FontWeight.bold),
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
                    children: List.generate(actions.length, (i) {
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
                                    ?.copyWith(color: Colors.black),
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
