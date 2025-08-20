import 'package:flutter/material.dart';

class PulsatingIndicator extends StatefulWidget {
  final bool isActive;
  final double size;

  const PulsatingIndicator({Key? key, required this.isActive, this.size = 12}) : super(key: key);

  @override
  _PulsatingIndicatorState createState() => _PulsatingIndicatorState();
}

class _PulsatingIndicatorState extends State<PulsatingIndicator> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _haloAnimation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);

    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.3).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    // Se usa un valor fijo, luego se multiplica por widget.size en build
    _haloAnimation = Tween<double>(begin: 0.0, end: 24.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.size * 3,
      height: widget.size * 3,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          double haloSize = _haloAnimation.value * (widget.size / 12); // Escalable según tamaño

          return Stack(
            alignment: Alignment.center,
            children: [
              // Halo pulsante semi-transparente
              Container(
                width: widget.size + haloSize,
                height: widget.size + haloSize,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: widget.isActive
                      ? Colors.green.withAlpha(20)
                      : Colors.red.withAlpha(20),
                ),
              ),
              // Círculo central pulsante
              Transform.scale(
                scale: _scaleAnimation.value,
                child: Container(
                  width: widget.size,
                  height: widget.size,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: widget.isActive ? Colors.green : Colors.red,
                    boxShadow: [
                      BoxShadow(
                        color: (widget.isActive ? Colors.green : Colors.red).withOpacity(0.4),
                        blurRadius: 8,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
