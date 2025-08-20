import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../widgets/pulsating_indicator.dart';

class BotPage extends StatelessWidget {
  final Map<String, dynamic> bot;

  const BotPage({super.key, required this.bot});

  @override
  Widget build(BuildContext context) {
    final infoLength = bot["info"].length;
    final crossAxisCount = 3;
    final tileHeight = 40.0;
    final rowCount = (infoLength / crossAxisCount).ceil();
    final gridHeight = rowCount * tileHeight;

    return Scaffold(
      appBar: AppBar(
        title: Text(bot["symbol"] ?? "Bot"),
        backgroundColor: Colors.blue,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              bot["description"] ?? "No description",
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            Obx(() => Row(
                  children: [
                    Text(
                      "Status: ",
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(
                      bot["enabled"]?.value == true ? "Active" : "Inactive",
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: bot["enabled"]?.value == true
                              ? Colors.green
                              : Colors.red),
                    ),
                    const SizedBox(width: 12),
                    PulsatingIndicator(
                      isActive: bot["live"]?.value ?? false,
                      size: 10,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      bot["live"]?.value == true ? "Live" : "Offline",
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                )),
            const SizedBox(height: 12),
            Text(
              "Iterations: ${bot["iterations"]}",
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
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
                        "${bot["id"]} - ${actions[i]["title"]} presionado"),
                    child: Align(
                      alignment: alignment,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: crossAlign,
                        children: [
                          Text(
                            actions[i]["title"]!,
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: Colors.grey),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            actions[i]["subtitle"]!,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: actions[i]["title"] == "Status" &&
                                          actions[i]["subtitle"] == "Stopped" ||
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
  }
}
