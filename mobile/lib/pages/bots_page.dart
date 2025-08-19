import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../controllers/bots_controller.dart';

class BotsPage extends StatelessWidget {
  const BotsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final BotsController controller = Get.put(BotsController());

    return Scaffold(
      backgroundColor: Colors.white,
      body: Obx(() {
        if (controller.bots.isEmpty) {
          return const Center(
            child: Text(
              "No hay bots disponibles",
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(12),
          itemCount: controller.bots.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final bot = controller.bots[index];

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

            return Card(
              elevation: 0,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Colors.grey.withAlpha(50),
                    width: 1,
                  ),
                ),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      child: ListTile(
                        dense: true,
                        visualDensity: const VisualDensity(vertical: -4),
                        contentPadding: EdgeInsets.zero,
                        leading: SvgPicture.asset(
                          'assets/icons/binance.svg',
                          width: 30,
                          height: 30,
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
                          style: const TextStyle(
                            fontSize: 14,
                            color: Colors.grey,
                          ),
                        ),
                        trailing: Obx(() {
                          return Switch(
                            value: bot["enabled"]?.value ?? false,
                            onChanged: (value) {
                              controller.updateBotStatus(bot, value);
                            },
                            activeThumbColor: Colors.blue,
                            activeTrackColor: Colors.grey.withAlpha(40),
                            inactiveThumbColor: Colors.grey,
                            inactiveTrackColor: Colors.grey.withAlpha(100),
                          );
                        }),
                      ),
                    ),
                    Container(
                      child: ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: const Text(
                          'PnL',
                          style: TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                        subtitle: const Text(
                          '\$1,250.50',
                          style: TextStyle(
                            color: Colors.green,
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),
                        onTap: () => print("${bot["name"]} - PnL presionado"),
                      ),
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
      }),
    );
  }
}
